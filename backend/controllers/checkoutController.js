import crypto from 'crypto';
import Razorpay from 'razorpay';
import pool from '../config/db.js';
import { sendOrderConfirmationEmail, sendAdminNewOrderEmail } from '../services/emailService.js';
import { sendAdminNewOrderWhatsApp } from '../services/whatsappService.js';
import dotenv from 'dotenv';

dotenv.config();

// Helper to initialize Razorpay client safely
const getRazorpayClient = () => {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId.startsWith('your-')) {
    console.warn('Razorpay credentials missing or dummy. Operating in MOCK mode for checkout.');
    return null;
  }

  return new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
};

/**
 * Creates a checkout order (saves draft to DB, initializes Razorpay order).
 * Payload: { address_id }
 */
export const createOrder = async (req, res) => {
  const connection = await pool.getConnection();
  try {
    const userId = req.userId;
    const { address_id } = req.body;

    if (!address_id) {
      return res.status(400).json({ error: 'Shipping Address ID is required.' });
    }

    await connection.beginTransaction();

    // 1. Fetch user's cart items from DB
    const cartQuery = `
      SELECT c.product_id, c.quantity, p.title, p.sp, p.weight, p.length, p.width, p.height, p.stock_qty
      FROM cart c
      JOIN products p ON c.product_id = p.product_id
      WHERE c.user_id = ?
    `;
    const [cartItems] = await connection.query(cartQuery, [userId]);

    if (cartItems.length === 0) {
      await connection.rollback();
      return res.status(400).json({ error: 'Your shopping cart is empty.' });
    }

    // 2. Validate stock availability and calculate total
    let totalAmount = 0;

    for (const item of cartItems) {
      if (item.quantity > item.stock_qty) {
        await connection.rollback();
        return res.status(400).json({
          error: `Insufficient stock for "${item.title}". Requested: ${item.quantity}, Available: ${item.stock_qty}`
        });
      }

      totalAmount += parseFloat(item.sp) * item.quantity;
    }

    // 3. Verify shipping address belongs to the user
    const [addresses] = await connection.query(
      'SELECT * FROM shipping_address WHERE id = ? AND user_id = ?',
      [address_id, userId]
    );
    if (addresses.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Shipping address not found.' });
    }

    // 4. Create record in orders table in Pending / Unpaid state
    // Note: Free shipping to user. shipping_charge column is 0.00 for billing
    const orderInsertQuery = `
      INSERT INTO orders (user_id, address_id, total_amount, shipping_charge, status, payment_status)
      VALUES (?, ?, ?, 0.00, 'Pending', 'Unpaid')
    `;
    const [orderResult] = await connection.query(orderInsertQuery, [userId, address_id, totalAmount]);
    const orderId = orderResult.insertId;

    // 5. Insert order items snapshots
    const itemsInsertQuery = `
      INSERT INTO order_items (order_id, product_id, quantity, price, weight, length, width, height)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    for (const item of cartItems) {
      await connection.query(itemsInsertQuery, [
        orderId,
        item.product_id,
        item.quantity,
        item.sp,
        item.weight,
        item.length,
        item.width,
        item.height
      ]);
    }

    await connection.commit();

    // 6. Handle Razorpay Order initialization
    const razorpay = getRazorpayClient();
    if (!razorpay) {
      // Mock flow (Razorpay key is missing/dummy)
      console.log(`[MOCK MODE] Initialized draft local order #${orderId} with amount: ₹${totalAmount}`);
      return res.status(200).json({
        mock: true,
        order_id: orderId,
        razorpay_order_id: `rzp_mock_${orderId}_${Date.now()}`,
        amount: totalAmount,
        currency: 'INR'
      });
    }

    const options = {
      amount: Math.round(totalAmount * 100), // paise
      currency: 'INR',
      receipt: String(orderId),
      notes: {
        local_order_id: String(orderId),
        user_id: String(userId)
      }
    };

    const rzpOrder = await razorpay.orders.create(options);
    console.log(`Razorpay order created for local order #${orderId}: ${rzpOrder.id}`);

    return res.status(200).json({
      mock: false,
      order_id: orderId,
      razorpay_order_id: rzpOrder.id,
      amount: totalAmount,
      currency: 'INR',
      key_id: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating checkout order:', error);
    return res.status(500).json({ error: 'Failed to initiate order checkout' });
  } finally {
    connection.release();
  }
};

/**
 * Marks an order as paid, exactly once. The order row is locked (SELECT ... FOR UPDATE), so the
 * browser check and the Razorpay webhook can both run for the same order without reducing stock
 * twice or writing duplicate payment records.
 * userId is optional: the webhook has no logged-in user, so it matches on order id only.
 * Returns { status: 'paid' | 'already_paid' | 'not_found' | 'amount_mismatch', order }.
 */
async function confirmPaidOrder({ orderId, userId = null, razorpayOrderId, paymentId, paymentSig, expectedAmountPaise = null }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [orders] = await connection.query(
      'SELECT * FROM orders WHERE id = ? AND (? IS NULL OR user_id = ?) FOR UPDATE',
      [orderId, userId, userId]
    );
    if (orders.length === 0) {
      await connection.rollback();
      return { status: 'not_found' };
    }
    const order = orders[0];

    if (order.payment_status === 'Paid') {
      await connection.rollback();
      return { status: 'already_paid', order };
    }

    if (expectedAmountPaise !== null && Math.round(parseFloat(order.total_amount) * 100) !== Number(expectedAmountPaise)) {
      await connection.rollback();
      return { status: 'amount_mismatch', order };
    }

    // Update order payment status and associate transaction id
    await connection.query(
      'UPDATE orders SET status = ?, payment_status = ?, payment_id = ? WHERE id = ?',
      ['Processing', 'Paid', paymentId, orderId]
    );

    // Record details in payments log table
    await connection.query(
      `INSERT INTO payments (order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, status, paid_at)
       VALUES (?, ?, ?, ?, ?, 'captured', NOW())`,
      [orderId, razorpayOrderId, paymentId, paymentSig, order.total_amount]
    );

    // Subtract product stock inventory
    const [orderItems] = await connection.query('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [orderId]);
    for (const item of orderItems) {
      await connection.query(
        'UPDATE products SET stock_qty = GREATEST(stock_qty - ?, 0) WHERE product_id = ?',
        [item.quantity, item.product_id]
      );
    }

    // Clear the buyer's database shopping cart
    await connection.query('DELETE FROM cart WHERE user_id = ?', [order.user_id]);

    await connection.commit();
    return {
      status: 'paid',
      order: { ...order, status: 'Processing', payment_status: 'Paid', payment_id: paymentId }
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

const isValidEmail = (em) => typeof em === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em);

/**
 * Sends the customer receipt and the owner alerts for a paid order.
 * Notifications are fire-and-forget: a failure is logged and never undoes a confirmed order.
 */
async function notifyCustomerAndOwner(order, paymentId, typedEmail) {
  const [[userInfo], [fullOrderItems], [addressRows]] = await Promise.all([
    pool.query('SELECT name, email, phone FROM users WHERE id = ?', [order.user_id]),
    pool.query(
      'SELECT oi.product_id, oi.quantity, oi.price, p.title, p.image1 FROM order_items oi JOIN products p ON oi.product_id = p.product_id WHERE oi.order_id = ?',
      [order.id]
    ),
    pool.query('SELECT * FROM shipping_address WHERE id = ?', [order.address_id])
  ]);
  const customer = userInfo[0] || {};
  const addr = addressRows[0] || {};

  // Prefer the email typed at checkout, fall back to the account email
  const customerEmail = isValidEmail(typedEmail) ? typedEmail.trim() : customer.email;
  const customerName = addr.full_name || customer.name || 'Customer';
  const createdAt = order.created_at || new Date();

  const notifyPayload = {
    order: { id: order.id, total_amount: order.total_amount, created_at: createdAt, payment_id: paymentId },
    customer: { name: customerName, email: customerEmail, phone: addr.phone || customer.phone },
    items: fullOrderItems,
    address: addr
  };

  sendOrderConfirmationEmail(notifyPayload)
    .catch(e => console.error('[Email] Customer receipt error:', e.message));
  sendAdminNewOrderEmail(notifyPayload)
    .catch(e => console.error('[Email] Admin alert error:', e.message));
  sendAdminNewOrderWhatsApp({ orderId: order.id, totalAmount: order.total_amount, customerName })
    .catch(e => console.error('[WhatsApp] Admin alert error:', e.message));

  return { fullOrderItems, customerEmail, createdAt };
}

/**
 * Verifies Razorpay payment signature, confirms the order, updates inventory, clears cart,
 * and sends the customer receipt + admin alerts. Delivery is handled locally (no courier API).
 * Payload: { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, mock_success, customer_email }
 */
export const verifyPayment = async (req, res) => {
  try {
    const userId = req.userId;
    const { order_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, mock_success, customer_email } = req.body;

    if (!order_id || !razorpay_order_id) {
      return res.status(400).json({ error: 'Missing required validation references.' });
    }

    const razorpay = getRazorpayClient();
    const isMockMode = !razorpay;

    // 1. Perform Payment Signature Verification
    if (isMockMode) {
      // Mock payments accept any order without checking money, so they are off unless explicitly enabled
      if (process.env.ALLOW_MOCK_PAYMENTS !== 'true') {
        console.error(`[SECURITY] Mock payment refused for order #${order_id}: Razorpay keys are missing. Set ALLOW_MOCK_PAYMENTS=true for local testing only.`);
        return res.status(503).json({ error: 'Payments are not available right now. Please try again later.' });
      }
      console.log(`[MOCK MODE] Verifying mock payment for order #${order_id}`);
      if (mock_success === false) {
        return res.status(400).json({ error: 'Mock payment failed by user.' });
      }
    } else {
      if (!razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing payment signature verification parameters.' });
      }

      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      const shasum = crypto.createHmac('sha256', keySecret);
      shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const expectedSignature = shasum.digest('hex');

      if (expectedSignature !== razorpay_signature) {
        console.error(`Signature mismatch! Expected: ${expectedSignature}, Received: ${razorpay_signature}`);
        return res.status(400).json({ error: 'Payment signature verification failed. Untrusted request.' });
      }
    }

    // 2. Confirm the order exactly once (locked row, so a webhook running at the same time cannot double-count)
    const paymentId = isMockMode ? `pay_mock_${order_id}_${Date.now()}` : razorpay_payment_id;
    const paymentSig = isMockMode ? 'mock_signature' : razorpay_signature;

    const result = await confirmPaidOrder({
      orderId: order_id,
      userId,
      razorpayOrderId: razorpay_order_id,
      paymentId,
      paymentSig
    });

    if (result.status === 'not_found') {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (result.status === 'already_paid') {
      return res.status(400).json({ error: 'Order has already been paid.' });
    }

    // 3. Receipt and alerts. A failure here must not hide a payment that already succeeded.
    let notified = { fullOrderItems: [], customerEmail: null, createdAt: result.order.created_at || new Date() };
    try {
      notified = await notifyCustomerAndOwner(result.order, paymentId, customer_email);
    } catch (e) {
      console.error('[Notify] Could not gather order details for alerts:', e.message);
    }

    return res.status(200).json({
      success: true,
      message: 'Payment verified and order confirmed.',
      order_id,
      payment_id: paymentId,
      created_at: notified.createdAt,
      total_amount: result.order.total_amount,
      items: notified.fullOrderItems,
      email_sent_to: notified.customerEmail || null
    });
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ error: 'Failed to verify payment and capture order details' });
  }
};

/**
 * Razorpay webhook. Razorpay calls this when a payment is captured, even if the customer's browser
 * never comes back to the site. Requires RAZORPAY_WEBHOOK_SECRET (the secret set in the Razorpay
 * dashboard under Webhooks). Mounted in server.js with a raw body parser, because the signature is
 * checked against the exact bytes Razorpay sent.
 */
export const razorpayWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.error('[Webhook] RAZORPAY_WEBHOOK_SECRET is not set. Webhook ignored.');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  const received = String(req.headers['x-razorpay-signature'] || '');
  const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
  const signatureOk = received.length === expected.length &&
    crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected));
  if (!signatureOk) {
    console.error('[Webhook] Signature mismatch. Request rejected.');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  if (event.event !== 'payment.captured') {
    return res.status(200).json({ ignored: true });
  }

  const payment = event.payload?.payment?.entity || {};
  const orderId = parseInt(payment.notes?.local_order_id, 10);
  if (!orderId) {
    console.error(`[Webhook] Payment ${payment.id} has no local_order_id in its notes. Ignored.`);
    return res.status(200).json({ ignored: true });
  }

  try {
    const result = await confirmPaidOrder({
      orderId,
      razorpayOrderId: payment.order_id,
      paymentId: payment.id,
      paymentSig: 'webhook',
      expectedAmountPaise: payment.amount
    });

    if (result.status === 'paid') {
      console.log(`[Webhook] Order #${orderId} confirmed from Razorpay webhook (payment ${payment.id}).`);
      await notifyCustomerAndOwner(result.order, payment.id, null);
    } else if (result.status === 'amount_mismatch') {
      console.error(`[Webhook] Order #${orderId} amount does not match payment ${payment.id}. Not marked paid; check manually.`);
    }

    return res.status(200).json({ status: result.status });
  } catch (error) {
    // 500 makes Razorpay retry the webhook later
    console.error('[Webhook] Could not confirm order:', error);
    return res.status(500).json({ error: 'Processing failed' });
  }
};

const groupByOrderId = (rows) => rows.reduce((acc, row) => {
  (acc[row.order_id] ||= []).push(row);
  return acc;
}, {});

/**
 * Retrieves the order history for the logged-in user, including items and delivery status.
 */
export const getOrders = async (req, res) => {
  try {
    const userId = req.userId;

    const ordersQuery = `
      SELECT o.*,
             a.full_name, a.phone, a.address_line1, a.address_line2, a.city, a.state, a.pincode
      FROM orders o
      JOIN shipping_address a ON o.address_id = a.id
      WHERE o.user_id = ?
      ORDER BY o.created_at DESC
    `;

    const [orders] = await pool.query(ordersQuery, [userId]);
    if (orders.length === 0) return res.status(200).json([]);

    // Fetch all items for all orders in one query (avoids one DB round-trip per order)
    const [items] = await pool.query(`
      SELECT oi.*, p.title, p.image1
      FROM order_items oi
      JOIN products p ON oi.product_id = p.product_id
      WHERE oi.order_id IN (?)
    `, [orders.map(o => o.id)]);

    const itemsByOrder = groupByOrderId(items);
    const result = orders.map(order => ({ ...order, items: itemsByOrder[order.id] || [] }));

    return res.status(200).json(result);
  } catch (error) {
    console.error('Error fetching order history:', error);
    return res.status(500).json({ error: 'Failed to retrieve order history' });
  }
};

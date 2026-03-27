const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Email transporter
let transporter = null;

if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS
        }
    });
    console.log('✅ Email configured');
} else {
    console.log('⚠️ Email not configured');
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        emailConfigured: !!transporter,
        timestamp: new Date()
    });
});

// Order confirmation email with original design
app.post('/api/order', async (req, res) => {
    const { name, email, order_id, services, message, total } = req.body;

    console.log('📦 Order received:', { name, email, order_id });

    if (!name || !email || !order_id) {
        return res.status(400).json({
            success: false,
            error: 'Missing required fields'
        });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const customerEmailHTML = `
        <div style="font-family: 'Jost', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f3ee; border-radius: 20px; overflow: hidden;">
            <div style="background: #1e1612; padding: 30px; text-align: center;">
                <h1 style="color: #f7f3ee; font-family: 'Cormorant Garamond', serif; font-size: 32px; margin: 0;">✨ Render Graphics ✨</h1>
            </div>
            <div style="padding: 40px 30px;">
                <h2 style="color: #1e1612; font-size: 24px; margin-bottom: 20px;">Thank you for your order, ${name}! 🎨</h2>
                <p style="color: #5f554c; line-height: 1.8; margin-bottom: 25px;">We've received your order and will start working on it soon. You can track your order anytime using the Order ID below.</p>
                
                <div style="background: rgba(160,120,88,0.1); border: 1px solid rgba(160,120,88,0.2); border-radius: 12px; padding: 20px; margin-bottom: 25px;">
                    <p style="margin: 0 0 8px 0;"><strong style="color: #1e1612;">📦 Order ID:</strong></p>
                    <p style="font-family: monospace; font-size: 18px; color: #a07858; margin: 0;">${order_id}</p>
                </div>
                
                ${services ? `
                <div style="margin-bottom: 20px;">
                    <p style="margin: 0 0 8px 0;"><strong style="color: #1e1612;">🖼️ Services:</strong></p>
                    <p style="color: #5f554c; margin: 0; white-space: pre-line;">${services}</p>
                </div>
                ` : ''}
                
                ${total ? `
                <div style="margin-bottom: 20px;">
                    <p style="margin: 0 0 8px 0;"><strong style="color: #1e1612;">💰 Total:</strong></p>
                    <p style="color: #5f554c; margin: 0;">${total}</p>
                </div>
                ` : ''}
                
                ${message ? `
                <div style="margin-bottom: 25px;">
                    <p style="margin: 0 0 8px 0;"><strong style="color: #1e1612;">💬 Your Message:</strong></p>
                    <p style="color: #5f554c; margin: 0; font-style: italic;">${message}</p>
                </div>
                ` : ''}
                
                <div style="background: #f0ebe3; border-radius: 12px; padding: 20px; text-align: center; margin-top: 30px;">
                    <p style="margin: 0 0 10px 0; color: #5f554c;">🔍 Track your order anytime:</p>
                    <a href="${baseUrl}/track.html" style="background: #a07858; color: white; padding: 10px 24px; text-decoration: none; border-radius: 999px; display: inline-block;">Track Order</a>
                </div>
            </div>
            <div style="background: #e8e0d4; padding: 20px; text-align: center;">
                <p style="color: #7a6e64; font-size: 12px; margin: 0;">© 2025 Render Graphics — Art made with love ❤️</p>
            </div>
        </div>
    `;

    if (transporter) {
        try {
            await transporter.sendMail({
                from: `"Render Graphics" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `🎨 Order Confirmation - ${order_id}`,
                html: customerEmailHTML
            });
            console.log(`✅ Email sent to ${email}`);
        } catch (error) {
            console.error('❌ Email failed:', error.message);
        }
    }

    res.json({
        success: true,
        message: 'Order submitted successfully! Check your email for confirmation.'
    });
});

// Status update email endpoint with original design
app.post('/api/order-status', async (req, res) => {
    const { orderId, name, email, status, customMessage } = req.body;

    console.log(`📧 Sending status update to ${email}: ${status}`);

    const statusMessages = {
        'Accepted': '✅ Your order has been accepted! We\'ll start working on it soon.',
        'On Progress': '🎨 Your artwork is now in progress! We\'re bringing your vision to life.',
        'Completed': '✨ Your order is complete! Your artwork is ready to download.'
    };

    const message = customMessage || statusMessages[status] || `Your order status has been updated to: ${status}`;
    const baseUrl = `${req.protocol}://${req.get('host')}`;

    const emailHTML = `
        <div style="font-family: 'Jost', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f7f3ee; border-radius: 20px; overflow: hidden;">
            <div style="background: #1e1612; padding: 30px; text-align: center;">
                <h1 style="color: #f7f3ee; font-family: 'Cormorant Garamond', serif; font-size: 32px; margin: 0;">✨ Render Graphics ✨</h1>
            </div>
            <div style="padding: 40px 30px;">
                <h2 style="color: #1e1612; font-size: 24px; margin-bottom: 20px;">Order Status Update, ${name}!</h2>
                
                <div style="background: rgba(160,120,88,0.1); border: 1px solid rgba(160,120,88,0.2); border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                    <p style="margin: 0 0 5px 0; color: #5f554c;">Your Order ID:</p>
                    <p style="font-family: monospace; font-size: 18px; color: #a07858; margin: 0;">${orderId}</p>
                </div>
                
                <div style="background: #f0ebe3; border-radius: 12px; padding: 20px; margin-bottom: 25px; text-align: center;">
                    <p style="font-size: 18px; margin-bottom: 10px;">📢</p>
                    <p style="color: #1e1612; font-weight: 500;">${message}</p>
                </div>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="${baseUrl}/track.html" style="background: #a07858; color: white; padding: 12px 32px; text-decoration: none; border-radius: 999px; display: inline-block;">Track Your Order</a>
                </div>
            </div>
            <div style="background: #e8e0d4; padding: 20px; text-align: center;">
                <p style="color: #7a6e64; font-size: 12px; margin: 0;">© 2025 Render Graphics — Art made with love ❤️</p>
            </div>
        </div>
    `;

    if (transporter) {
        try {
            await transporter.sendMail({
                from: `"Render Graphics" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: `📢 Order Status Update - ${orderId}`,
                html: emailHTML
            });
            console.log(`✅ Status email sent to ${email}`);
        } catch (error) {
            console.error('❌ Status email failed:', error.message);
        }
    }

    res.json({ success: true });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({ 
        message: 'Render Graphics API is running!',
        endpoints: ['/api/health', '/api/test-email', '/api/order', '/api/order-status']
    });
});

module.exports = app;
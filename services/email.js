const nodemailer = require('nodemailer');

// 邮件配置
const emailConfig = {
    host: process.env.SMTP_HOST || 'smtp.qq.com', // 默认使用QQ邮箱
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER || 'your-email@qq.com', // 发件人邮箱
        pass: process.env.SMTP_PASS || 'your-app-password' // 邮箱授权码
    }
};

// 创建邮件传输器
let transporter = null;

function createTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransporter(emailConfig);
    }
    return transporter;
}

// 生成6位数字验证码
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 发送验证码邮件
async function sendVerificationEmail(to, code) {
    try {
        const mailTransporter = createTransporter();
        
        const mailOptions = {
            from: `"学习追踪器" <${emailConfig.auth.user}>`,
            to: to,
            subject: '学习追踪器 - 邮箱验证码',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">📚 学习追踪器</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">邮箱验证码</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; margin-bottom: 20px;">您好！</h2>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            感谢您注册学习追踪器！为了确保您的账户安全，请输入以下验证码完成注册：
                        </p>
                        
                        <div style="background: white; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
                            <div style="font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; font-family: 'Courier New', monospace;">
                                ${code}
                            </div>
                        </div>
                        
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            <strong>验证码有效期：</strong>10分钟<br>
                            <strong>如果这不是您的操作，请忽略此邮件。</strong>
                        </p>
                        
                        <div style="border-top: 1px solid #ddd; padding-top: 20px; margin-top: 30px;">
                            <p style="color: #999; font-size: 12px; margin: 0;">
                                此邮件由系统自动发送，请勿回复。<br>
                                如有问题，请联系管理员。
                            </p>
                        </div>
                    </div>
                </div>
            `
        };

        const info = await mailTransporter.sendMail(mailOptions);
        console.log('验证码邮件发送成功:', info.messageId);
        return true;
    } catch (error) {
        console.error('发送验证码邮件失败:', error);
        return false;
    }
}

// 验证邮件配置
function validateEmailConfig() {
    const requiredFields = ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'];
    const missingFields = requiredFields.filter(field => !process.env[field]);
    
    if (missingFields.length > 0) {
        console.warn('⚠️  邮件配置不完整，以下环境变量未设置:');
        missingFields.forEach(field => console.warn(`   - ${field}`));
        console.warn('📧 邮箱验证功能将不可用，请配置邮件服务器信息。');
        return false;
    }
    
    return true;
}

module.exports = {
    sendVerificationEmail,
    generateVerificationCode,
    validateEmailConfig
}; 
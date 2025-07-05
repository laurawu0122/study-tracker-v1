const nodemailer = require('nodemailer');
const { db } = require('../database/db');

// 从数据库获取邮件配置
async function getEmailConfig() {
    try {
        const configs = await db('system_config')
            .whereIn('key', [
                'smtp_enabled',
                'smtp_host',
                'smtp_port',
                'smtp_user',
                'smtp_pass',
                'smtp_from_name',
                'smtp_from_email',
                'smtp_secure',
                'email_verification_enabled'
            ])
            .select('*');

        const config = {};
        configs.forEach(item => {
            let value = item.value;
            
            // 根据类型转换值
            switch (item.type) {
                case 'boolean':
                    value = value === 'true';
                    break;
                case 'number':
                    value = parseInt(value) || 0;
                    break;
            }
            
            config[item.key] = value;
        });

        // 如果SMTP未启用，返回null
        if (!config.smtp_enabled) {
            return null;
        }

        return {
            host: config.smtp_host,
            port: config.smtp_port,
            secure: config.smtp_secure,
            auth: {
                user: config.smtp_user,
                pass: config.smtp_pass
            },
            fromName: config.smtp_from_name,
            fromEmail: config.smtp_from_email,
            emailVerificationEnabled: config.email_verification_enabled
        };
    } catch (error) {
        console.error('获取邮件配置失败:', error);
        return null;
    }
}

// 创建邮件传输器
async function createTransporter() {
    const emailConfig = await getEmailConfig();
    if (!emailConfig) {
        throw new Error('邮件服务未配置或未启用');
    }
    
    return nodemailer.createTransport({
        host: emailConfig.host,
        port: emailConfig.port,
        secure: emailConfig.secure,
        auth: emailConfig.auth
    });
}

// 生成6位数字验证码
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// 存储验证码到数据库
async function storeVerificationCode(email, code, type = 'registration') {
    try {
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟后过期
        
        await db('email_verifications').insert({
            email: email,
            verification_code: code,
            type: type, // 支持 registration 和 reset 类型
            expires_at: expiresAt,
            created_at: new Date()
        });
        
        return true;
    } catch (error) {
        console.error('存储验证码失败:', error);
        return false;
    }
}

// 验证邮箱验证码
async function verifyCode(email, code, type = 'registration') {
    try {
        console.log('🔍 开始验证验证码:', { email, code, type });
        
        const verification = await db('email_verifications')
            .where({
                email: email,
                verification_code: code,
                type: type, // 支持 registration 和 reset 类型
                used: false
            })
            .where('expires_at', '>', new Date())
            .first();
        
        console.log('🔍 验证码查询结果:', verification);
        
        if (!verification) {
            console.log('❌ 验证码无效或已过期');
            return { valid: false, message: '验证码无效或已过期' };
        }
        
        // 标记验证码为已使用
        await db('email_verifications')
            .where('id', verification.id)
            .update({
                used: true,
                used_at: new Date()
            });
        
        console.log('✅ 验证码验证成功');
        return { valid: true, message: '验证码验证成功' };
    } catch (error) {
        console.error('❌ 验证码验证失败:', error);
        return { valid: false, message: '验证码验证失败' };
    }
}

// 检查邮箱是否已注册
async function isEmailRegistered(email) {
    try {
        const user = await db('users').where('email', email).first();
        return !!user;
    } catch (error) {
        console.error('检查邮箱注册状态失败:', error);
        return false;
    }
}

// 发送验证码邮件
async function sendVerificationEmail(to, code, type = 'registration') {
    try {
        console.log('📧 开始发送验证码邮件:', { to, code, type });
        
        const emailConfig = await getEmailConfig();
        console.log('📧 邮件配置:', emailConfig);
        
        if (!emailConfig) {
            throw new Error('邮件服务未配置或未启用');
        }
        
        if (!emailConfig.emailVerificationEnabled) {
            throw new Error('邮箱验证功能未启用');
        }
        
        console.log('📧 创建邮件传输器...');
        const mailTransporter = await createTransporter();
        
        // 根据类型设置不同的邮件内容
        let subject, purpose, description;
        if (type === 'reset') {
            subject = '学习追踪器 - 密码重置验证码';
            purpose = '重置密码';
            description = '您正在重置学习追踪器的账户密码。为了确保账户安全，请输入以下验证码完成密码重置：';
        } else {
            subject = '学习追踪器 - 邮箱验证码';
            purpose = '完成注册';
            description = '感谢您注册学习追踪器！为了确保您的账户安全，请输入以下验证码完成注册：';
        }
        
        const mailOptions = {
            from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
            to: to,
            subject: subject,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
                        <h1 style="margin: 0; font-size: 24px;">📚 学习追踪器</h1>
                        <p style="margin: 10px 0 0 0; opacity: 0.9;">${purpose}验证码</p>
                    </div>
                    
                    <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px;">
                        <h2 style="color: #333; margin-bottom: 20px;">您好！</h2>
                        <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
                            ${description}
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

        console.log('📧 发送邮件...');
        const info = await mailTransporter.sendMail(mailOptions);
        console.log('✅ 验证码邮件发送成功:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (error) {
        console.error('❌ 发送验证码邮件失败:', error);
        return { success: false, error: error.message };
    }
}

// 清理过期的验证码
async function cleanupExpiredCodes() {
    try {
        await db('email_verifications')
            .where('expires_at', '<', new Date())
            .del();
        console.log('已清理过期验证码');
    } catch (error) {
        console.error('清理过期验证码失败:', error);
    }
}

// 通用发送邮件函数
async function sendEmail({ to, subject, html, text }) {
    try {
        const emailConfig = await getEmailConfig();
        if (!emailConfig) {
            throw new Error('邮件服务未配置或未启用');
        }
        
        const mailTransporter = await createTransporter();
        
        const mailOptions = {
            from: `"${emailConfig.fromName}" <${emailConfig.fromEmail}>`,
            to: to,
            subject: subject,
            html: html,
            text: text
        };

        const info = await mailTransporter.sendMail(mailOptions);
        console.log('邮件发送成功:', info.messageId);
        return true;
    } catch (error) {
        console.error('发送邮件失败:', error);
        return false;
    }
}

// 验证邮件配置
async function validateEmailConfig() {
    try {
        const emailConfig = await getEmailConfig();
        if (!emailConfig) {
            console.warn('⚠️  邮件服务未配置或未启用');
            console.warn('📧 邮箱验证功能将不可用，请在系统管理中配置SMTP设置。');
            return false;
        }
        
        if (!emailConfig.emailVerificationEnabled) {
            console.warn('⚠️  邮箱验证功能未启用');
            console.warn('📧 请在系统管理中启用邮箱验证功能。');
            return false;
        }
        
        console.log('✅ 邮件配置验证通过');
        return true;
    } catch (error) {
        console.error('验证邮件配置失败:', error);
        return false;
    }
}

module.exports = {
    sendVerificationEmail,
    sendEmail,
    generateVerificationCode,
    storeVerificationCode,
    verifyCode,
    isEmailRegistered,
    cleanupExpiredCodes,
    validateEmailConfig
}; 
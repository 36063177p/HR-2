// ===== تحسينات مجموعة الشهباء التجارية =====

// تبسيط النظام للاكتفاء بالموقع الجغرافي فقط
document.addEventListener('DOMContentLoaded', function() {
    console.log('🏢 تحميل تحسينات مجموعة الشهباء التجارية...');
    
    // إزالة جميع العناصر المتعلقة بالطرق الأخرى
    setTimeout(() => {
        const elementsToHide = [
            'qrMethod', 'wifiMethod', 'passwordMethod',
            'qrMethodBtn', 'wifiMethodBtn', 'passwordMethodBtn',
            'smartRecommendation', 'method-buttons'
        ];
        
        elementsToHide.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = 'none';
            }
        });
        
        // إخفاء أي عناصر بـ class
        const classesToHide = ['method-buttons', 'attendance-methods'];
        classesToHide.forEach(className => {
            const elements = document.getElementsByClassName(className);
            for (let i = 0; i < elements.length; i++) {
                elements[i].style.display = 'none';
            }
        });
        
        console.log('✅ تم تبسيط النظام للاكتفاء بالموقع الجغرافي فقط');
    }, 500);
});

// دالة محسنة لتحديث حالة الموقع بتصميم الشهباء
function updateShahbaLocationStatus(message, type = 'info') {
    const locationStatus = document.getElementById('locationStatus');
    if (locationStatus) {
        const colors = {
            success: 'linear-gradient(135deg, #4caf50, #66bb6a)',
            error: 'linear-gradient(135deg, #f44336, #e57373)',
            warning: 'linear-gradient(135deg, #ffc107, #ffeb3b)',
            info: 'linear-gradient(135deg, #2e7d32, #4caf50)'
        };
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: '🔍'
        };
        
        locationStatus.innerHTML = `
            <div style="text-align: center; color: white;">
                <div style="font-size: 32px; margin-bottom: 15px;">${icons[type] || icons.info}</div>
                <p style="margin: 0; font-size: 18px; font-weight: 600;">${message}</p>
            </div>
        `;
        
        locationStatus.style.background = colors[type] || colors.info;
        locationStatus.style.border = '2px solid rgba(255,255,255,0.3)';
        locationStatus.style.animation = 'pulseGlow 2s ease-in-out infinite';
    }
}

// إضافة CSS للتأثيرات المتحركة
const shahbaCSS = `
<style>
@keyframes pulseGlow {
    0%, 100% { box-shadow: 0 0 10px rgba(255,255,255,0.3); }
    50% { box-shadow: 0 0 25px rgba(255,255,255,0.6); }
}

.shahba-enhanced {
    transition: all 0.3s ease;
}

.shahba-enhanced:hover {
    transform: scale(1.02);
}

/* تحسين الخطوط العربية */
body {
    font-family: 'Segoe UI', 'Tahoma', 'Arial', sans-serif;
}

.arabic-text {
    font-family: 'Tahoma', 'Arabic UI Text', 'Segoe UI', Arial, sans-serif;
}
</style>
`;

// إضافة الـ CSS للصفحة
document.head.insertAdjacentHTML('beforeend', shahbaCSS);

// تحسين دالة تحديث الوقت الحالي
function enhanceCurrentTime() {
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement && dateElement) {
        const now = new Date();
        
        // تنسيق الوقت
        const timeOptions = {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false,
            timeZone: 'Asia/Riyadh'
        };
        
        // تنسيق التاريخ
        const dateOptions = {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'Asia/Riyadh'
        };
        
        timeElement.textContent = now.toLocaleTimeString('ar-SA', timeOptions);
        // استخدام دالة formatDate الموحدة للتطبيق
        if (typeof formatDate === 'function') {
            dateElement.textContent = formatDate(now);
        } else {
            // Fallback للحالات الاستثنائية
            const day = String(now.getDate()).padStart(2, '0');
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const year = now.getFullYear();
            dateElement.textContent = `${day}-${month}-${year}`;
        }
        
        // إضافة تأثير متحرك للوقت
        timeElement.style.animation = 'none';
        setTimeout(() => {
            timeElement.style.animation = 'pulseTime 1s ease-in-out';
        }, 10);
    }
}

// تحديث الوقت كل ثانية مع تحسينات
setInterval(enhanceCurrentTime, 1000);

// CSS إضافي للوقت
const timeCSS = `
<style>
@keyframes pulseTime {
    0% { transform: scale(1); }
    50% { transform: scale(1.05); }
    100% { transform: scale(1); }
}

#currentTime {
    background: linear-gradient(45deg, #2e7d32, #4caf50);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', timeCSS);

// دالة لإضافة شعار الشهباء (اختياري)
function addShahbaLogo() {
    const headers = document.querySelectorAll('.header h1');
    headers.forEach(header => {
        if (!header.querySelector('.shahba-logo')) {
            const logo = document.createElement('span');
            logo.className = 'shahba-logo';
            logo.innerHTML = '🏢';
            logo.style.marginLeft = '10px';
            logo.style.fontSize = '1.2em';
            header.prepend(logo);
        }
    });
}

// تطبيق الشعار
setTimeout(addShahbaLogo, 1000);

// دالة لإضافة تصميم عصري للموظفين
function addModernEmployeeDesign() {
    if (!currentUser || currentUser.role !== 'employee') {
        return;
    }
    
    console.log('🎨 تطبيق التصميم العصري للموظف...');
    
    // إضافة إعدادات سريعة مخفية في قائمة منسدلة (للحالات الطارئة فقط)
    const reportContainer = document.getElementById('employeeFinancialReport');
    if (reportContainer && !document.getElementById('hiddenQuickActions')) {
        const hiddenActions = document.createElement('div');
        hiddenActions.id = 'hiddenQuickActions';
        hiddenActions.innerHTML = `
            <details class="emergency-actions" style="margin: 10px 0;">
                <summary style="cursor: pointer; color: #6c757d; font-size: 12px; padding: 5px;">🔧 إعدادات متقدمة</summary>
                <div style="display: flex; gap: 5px; margin-top: 10px; flex-wrap: wrap;">
                    <button onclick="forceFixFinancialDisplay()" class="mini-btn">إصلاح</button>
                    <button onclick="showAllEmployeeFinancialData()" class="mini-btn">عرض الكل</button>
                </div>
            </details>
        `;
        reportContainer.appendChild(hiddenActions);
    }
}

// إضافة التصميم العصري عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    // انتظار تحميل المستخدم
    setTimeout(() => {
        addModernEmployeeDesign();
        applyModernTheme();
        applyAdditionalEnhancements();
    }, 2000);
});

// دالة لتطبيق تحسينات إضافية على التصميم
function applyAdditionalEnhancements() {
    console.log('⚡ تطبيق تحسينات إضافية...');
    
    // إضافة class عصرية للبطاقات الموجودة
    const cards = document.querySelectorAll('[style*="background:"], [style*="padding:"]');
    cards.forEach(card => {
        if (!card.classList.contains('modern-card')) {
            card.classList.add('modern-card');
        }
    });
    
    // تحسين العناوين
    const headers = document.querySelectorAll('h2, h3, h4');
    headers.forEach(header => {
        header.style.fontWeight = '600';
        header.style.color = '#2d3748';
    });
    
    console.log('✅ تم تطبيق التحسينات الإضافية');
}

// إضافة التصميم العصري عند تحميل البيان المالي
const originalLoadEmployeeFinancialReportEnhanced = window.loadEmployeeFinancialReport;
if (originalLoadEmployeeFinancialReportEnhanced) {
    window.loadEmployeeFinancialReport = function() {
        const result = originalLoadEmployeeFinancialReportEnhanced.apply(this, arguments);
        
        // تطبيق التصميم العصري
        setTimeout(() => {
            applyModernTheme();
            addModernEmployeeDesign();
            applyAdditionalEnhancements();
        }, 300);
        
        return result;
    };
}

// تحسين عرض بوابة الموظف بتصميم عصري
const originalShowEmployeeDashboard = window.showEmployeeDashboard;
if (originalShowEmployeeDashboard) {
    window.showEmployeeDashboard = function() {
        const result = originalShowEmployeeDashboard.apply(this, arguments);
        
        // تطبيق التصميم العصري
        setTimeout(() => {
            const reportContainer = document.getElementById('employeeFinancialReport');
            if (reportContainer) {
                reportContainer.style.display = 'block';
                
                // تحميل البيان المالي
                if (typeof loadEmployeeFinancialReport === 'function') {
                    loadEmployeeFinancialReport();
                }
                
                applyModernTheme();
                addModernEmployeeDesign();
                applyAdditionalEnhancements();
            }
        }, 500);
        
        return result;
    };
}

// دالة تطبيق التصميم العصري
function applyModernTheme() {
    console.log('🎨 تطبيق التصميم العصري...');
    
    // إضافة CSS عصري للتطبيق
    if (!document.getElementById('modernThemeCSS')) {
        const modernCSS = document.createElement('style');
        modernCSS.id = 'modernThemeCSS';
        modernCSS.innerHTML = `
            /* تصميم عصري متجاوب */
            * {
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                margin: 0;
                padding: 0;
                min-height: 100vh;
            }
            
            /* أزرار عصرية */
            .modern-btn {
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 12px 24px;
                border: none;
                border-radius: 12px;
                font-weight: 600;
                font-size: 14px;
                cursor: pointer;
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                text-decoration: none;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                position: relative;
                overflow: hidden;
            }
            
            .modern-btn::before {
                content: '';
                position: absolute;
                top: 0;
                left: -100%;
                width: 100%;
                height: 100%;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
                transition: left 0.5s;
            }
            
            .modern-btn:hover::before {
                left: 100%;
            }
            
            .modern-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.25);
            }
            
            .modern-btn:active {
                transform: translateY(0);
            }
            
            .modern-btn.primary {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            }
            
            .modern-btn .icon {
                font-size: 16px;
            }
            
            /* بطاقات عصرية */
            .modern-card {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 20px;
                padding: 24px;
                margin: 16px 0;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                transition: all 0.3s ease;
            }
            
            .modern-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
            }
            
            /* معلومات الأسبوع العصرية */
            .week-info-card {
                display: flex;
                align-items: center;
                gap: 12px;
                background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
                padding: 16px;
                border-radius: 16px;
                margin: 16px 0;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.3);
            }
            
            .info-icon {
                font-size: 24px;
                background: rgba(255, 255, 255, 0.8);
                width: 48px;
                height: 48px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .info-text {
                display: flex;
                flex-direction: column;
                gap: 4px;
            }
            
            .info-title {
                font-weight: 600;
                color: #2d3748;
                font-size: 16px;
            }
            
            .info-subtitle {
                color: #4a5568;
                font-size: 14px;
            }
            
            /* تحسين البطاقات المالية */
            .financial-card {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                border-radius: 16px !important;
                padding: 20px !important;
                text-align: center !important;
                color: white !important;
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important;
                border: none !important;
                transition: all 0.3s ease !important;
                position: relative !important;
                overflow: hidden !important;
            }
            
            .financial-card::before {
                content: '';
                position: absolute;
                top: -50%;
                right: -50%;
                width: 100%;
                height: 100%;
                background: radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%);
                transform: rotate(45deg);
            }
            
            .financial-card:hover {
                transform: translateY(-4px) scale(1.02);
                box-shadow: 0 12px 40px rgba(0, 0, 0, 0.2);
            }
            
            /* تحسين الجداول */
            .table-container {
                background: rgba(255, 255, 255, 0.95);
                backdrop-filter: blur(20px);
                border-radius: 16px;
                overflow: hidden;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
            }
            
            table {
                border-collapse: collapse;
                border-radius: 16px;
                overflow: hidden;
                background: transparent;
            }
            
            th {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 16px;
                font-weight: 600;
                border: none;
                font-size: 14px;
            }
            
            td {
                padding: 12px 16px;
                border-bottom: 1px solid rgba(0, 0, 0, 0.05);
                color: #2d3748;
                font-size: 14px;
            }
            
            tr:hover {
                background: rgba(102, 126, 234, 0.05);
            }
            
            /* تحسين الهيدر */
            .header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
                border-radius: 0 0 24px 24px !important;
                padding: 24px !important;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15) !important;
            }
            
            .header h1 {
                margin: 0 !important;
                font-size: 24px !important;
                font-weight: 700 !important;
            }
            
            /* تحسين الأقسام */
            .section, .dashboard-section {
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(20px) !important;
                border-radius: 20px !important;
                margin: 16px !important;
                padding: 24px !important;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
            }
            
            /* تحسين أزرار تسجيل الحضور */
            .attendance-btn {
                background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%) !important;
                border: none !important;
                border-radius: 16px !important;
                padding: 16px 24px !important;
                color: white !important;
                font-weight: 600 !important;
                font-size: 16px !important;
                box-shadow: 0 4px 20px rgba(79, 172, 254, 0.3) !important;
                transition: all 0.3s ease !important;
                margin: 8px !important;
            }
            
            .attendance-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 30px rgba(79, 172, 254, 0.4) !important;
            }
            
            .attendance-btn.checkout {
                background: linear-gradient(135deg, #fa709a 0%, #fee140 100%) !important;
                box-shadow: 0 4px 20px rgba(250, 112, 154, 0.3) !important;
            }
            
            .attendance-btn.checkout:hover {
                box-shadow: 0 8px 30px rgba(250, 112, 154, 0.4) !important;
            }
            
            /* أزرار صغيرة للإعدادات */
            .mini-btn {
                background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
                border: none;
                border-radius: 8px;
                padding: 6px 12px;
                font-size: 12px;
                color: #2d3748;
                cursor: pointer;
                transition: all 0.2s ease;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            }
            
            .mini-btn:hover {
                transform: translateY(-1px);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            }
            
            /* إعدادات الطوارئ */
            .emergency-actions {
                margin-top: 20px;
                padding-top: 20px;
                border-top: 1px solid rgba(0, 0, 0, 0.1);
            }
            
            .emergency-actions summary {
                list-style: none;
                outline: none;
            }
            
            .emergency-actions summary::marker {
                display: none;
            }
            
            /* تحسين التجاوب مع الجوال */
            @media (max-width: 768px) {
                .financial-overview {
                    grid-template-columns: 1fr !important;
                    gap: 12px !important;
                }
                
                .modern-btn {
                    padding: 10px 16px;
                    font-size: 13px;
                }
                
                .section, .dashboard-section {
                    margin: 8px !important;
                    padding: 16px !important;
                    border-radius: 16px !important;
                }
                
                .financial-card {
                    padding: 16px !important;
                }
                
                table {
                    font-size: 12px;
                }
                
                th, td {
                    padding: 8px !important;
                }
            }
            
            /* انيميشن دخول العناصر */
            @keyframes slideInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .modern-card, .section, .dashboard-section {
                animation: slideInUp 0.6s ease-out;
            }
            
            /* تحسين التمرير */
            ::-webkit-scrollbar {
                width: 8px;
            }
            
            ::-webkit-scrollbar-track {
                background: rgba(0, 0, 0, 0.1);
                border-radius: 4px;
            }
            
            ::-webkit-scrollbar-thumb {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 4px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background: linear-gradient(135deg, #5a67d8 0%, #6b46a3 100%);
            }
            
            /* إخفاء العناصر المزدحمة */
            details[style*="margin: 10px"] {
                opacity: 0.7;
                transition: opacity 0.3s ease;
            }
            
            details[style*="margin: 10px"]:hover {
                opacity: 1;
            }
            
            /* تحسين مظهر اختيار الأسبوع */
            input[type="week"] {
                background: rgba(255, 255, 255, 0.9) !important;
                border: 2px solid #667eea !important;
                border-radius: 12px !important;
                padding: 12px 16px !important;
                font-size: 14px !important;
                color: #2d3748 !important;
                transition: all 0.3s ease !important;
            }
            
            input[type="week"]:focus {
                outline: none !important;
                border-color: #4facfe !important;
                box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1) !important;
            }
            
            /* تحسين summary items */
            .summary-item {
                background: rgba(255, 255, 255, 0.95) !important;
                backdrop-filter: blur(10px) !important;
                border: 1px solid rgba(255, 255, 255, 0.2) !important;
                border-radius: 12px !important;
                padding: 16px !important;
                transition: all 0.3s ease !important;
            }
            
            .summary-item:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1) !important;
            }
            
            /* إخفاء النصوص المزدحمة */
            small[style*="color: #856404"] {
                display: none !important;
            }
            
            /* تحسين هيكل الصفحة */
            .dashboard {
                padding: 0 !important;
                background: transparent !important;
            }
        `;
        
        document.head.appendChild(modernCSS);
        console.log('✅ تم تطبيق التصميم العصري');
        
        // تطبيق تحسينات فورية إضافية
        setTimeout(() => {
            // إخفاء العناصر المزدحمة
            const clutteredElements = document.querySelectorAll('[style*="background: #fff3cd"], [style*="border-left: 4px solid #ffc107"]');
            clutteredElements.forEach(el => {
                if (el.textContent.includes('مشاكل البيانات') || el.textContent.includes('تشخيص')) {
                    el.style.display = 'none';
                }
            });
            
            // تنظيف الأزرار المتعددة
            const buttonContainers = document.querySelectorAll('div[style*="flex-wrap: wrap"]');
            buttonContainers.forEach(container => {
                if (container.children.length > 3) {
                    // إبقاء أول 3 أزرار فقط
                    for (let i = 3; i < container.children.length; i++) {
                        container.children[i].style.display = 'none';
                    }
                }
            });
            
            console.log('🧹 تم تنظيف الواجهة من العناصر المزدحمة');
        }, 500);
    }
}

console.log('🎉 تم تحميل جميع تحسينات مجموعة الشهباء التجارية بنجاح!');
console.log('🎨 التصميم العصري الجديد: بساطة، أناقة، وتجربة مستخدم محسنة');
console.log('📱 تحسين كامل للجوال مع دعم PWA وتقنيات حديثة');
console.log('💰 نظام الساعات الإضافية متكامل (1.5 ضعف بعد 7:00 مساءً)');
console.log('🧹 تم تنظيف الواجهة من الازدحام (من 15+ زر إلى 3 أزرار أساسية)');
console.log('✨ Glass Morphism, Backdrop Blur, وتأثيرات حركية سلسة'); 
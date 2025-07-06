// إعداد البيانات الأولية
let currentUser = null;
let employees = JSON.parse(localStorage.getItem('employees')) || [];
let attendance = JSON.parse(localStorage.getItem('attendance')) || [];
let finances = JSON.parse(localStorage.getItem('finances')) || [];
let branches = JSON.parse(localStorage.getItem('branches')) || [];

// متغيرات نظام الحضور الجغرافي
let validatedLocation = null; // تخزين الموقع المعتمد

// إضافة المدير الافتراضي
if (!employees.find(emp => emp.username === 'admin')) {
    employees.push({
        id: 'admin',
        name: 'المدير العام',
        username: 'admin',
        password: 'admin123',
        position: 'مدير',
        salary: 0,
        currency: 'SAR',
        role: 'manager'
    });
    saveData();
}

// دالة للحصول على رمز العملة
function getCurrencySymbol(currency) {
    const symbols = {
        'SAR': 'ريال',
        'USD': '$',
        'SYP': 'ل.س'
    };
    return symbols[currency] || 'ريال';
}

// دالة تنسيق التاريخ (DD-MM-YYYY) - التنسيق الموحد للتطبيق (محسنة للتعامل مع timezone)
function formatDate(date) {
    let d;
    
    if (typeof date === 'string') {
        // إذا كان النص بتنسيق ISO (YYYY-MM-DD), تعامل معه بحذر لتجنب مشاكل timezone
        if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            // إنشاء تاريخ محلي دون تحويل timezone
            const [year, month, day] = date.split('-');
            d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        } else {
            d = new Date(date);
        }
    } else {
        d = new Date(date);
    }
    
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
}

// دالة تنسيق التاريخ والوقت معاً (DD-MM-YYYY - HH:MM:SS) - للاستخدام في الطباعة والتقارير
function formatDateTime(date) {
    const formattedDate = formatDate(date);
    const formattedTime = new Date(date).toLocaleTimeString('ar-SA');
    return `${formattedDate} - ${formattedTime}`;
}

// دالة للحصول على التاريخ المحلي بتنسيق ISO (YYYY-MM-DD) - تجنب مشاكل timezone
function getLocalDateISO(date = new Date()) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// دالة حساب الوقت بدقة مع حساب ساعات الإضافي (ساعات:دقائق:ثواني)
function calculatePreciseTime(startTime, endTime, date) {
    // تحسين دالة تحويل الوقت
    const normalizeTime = (time) => {
        if (!time) return '00:00:00';
        
        // إذا كان الوقت يحتوي على العربية (ص أو م)
        if (time.includes('ص') || time.includes('م')) {
            try {
                // تحويل الأرقام العربية إلى إنجليزية أولاً
                let normalizedTime = time
                    .replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)) // تحويل الأرقام العربية
                    .replace(/:/g, ':'); // التأكد من النقطتين

                // تحويل الصيغة العربية إلى 12-hour format إنجليزي
                let timeStr = normalizedTime.replace('ص', ' AM').replace('م', ' PM');
                
                // إنشاء تاريخ للتحويل
                const fullDateTime = `${date} ${timeStr}`;
                const dateObj = new Date(fullDateTime);
                
                // إذا كان التاريخ غير صحيح، جرب طريقة بديلة
                if (isNaN(dateObj.getTime())) {
                    // طريقة يدوية لتحويل الوقت العربي
                    const parts = normalizedTime.match(/(\d{1,2}):(\d{1,2}):(\d{1,2})\s*(ص|م)/);
                    if (parts) {
                        let hours = parseInt(parts[1]);
                        const minutes = parseInt(parts[2]);
                        const seconds = parseInt(parts[3]);
                        const period = parts[4];
                        
                        // تحويل إلى 24 ساعة
                        if (period === 'م' && hours !== 12) {
                            hours += 12;
                        } else if (period === 'ص' && hours === 12) {
                            hours = 0;
                        }
                        
                        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
                    }
                }
                
                // استخدام التاريخ المحول
                return dateObj.toTimeString().slice(0, 8);
            } catch (error) {
                console.warn('خطأ في تحويل الوقت العربي:', time, error);
                return '00:00:00';
            }
        }
        
        // إذا كان بالفعل في صيغة 24 ساعة، تأكد من التنسيق
        const timeMatch = time.match(/^(\d{1,2}):(\d{1,2}):(\d{1,2})$/);
        if (timeMatch) {
            const hours = parseInt(timeMatch[1]).toString().padStart(2, '0');
            const minutes = parseInt(timeMatch[2]).toString().padStart(2, '0');
            const seconds = parseInt(timeMatch[3]).toString().padStart(2, '0');
            return `${hours}:${minutes}:${seconds}`;
        }
        
        return time; // إرجاع الوقت كما هو إذا لم نستطع تحويله
    };
    
    const normalizedStart = normalizeTime(startTime);
    const normalizedEnd = normalizeTime(endTime);
    
    console.log('🔄 تحويل الأوقات:', {
        original: { start: startTime, end: endTime },
        normalized: { start: normalizedStart, end: normalizedEnd }
    });
    
    const start = new Date(`${date} ${normalizedStart}`);
    const end = new Date(`${date} ${normalizedEnd}`);
    const diffMs = end - start;
    
    // التأكد من أن الفرق موجب
    if (diffMs < 0) {
        console.error('⚠️ فرق الوقت سالب - خطأ في التحويل');
        return {
            totalMs: 0,
            totalHours: 0,
            regularHours: 0,
            overtimeHours: 0,
            effectiveHours: 0,
            display: '00:00:00',
            breakdown: 'لا يوجد وقت عمل'
        };
    }
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
    
    const totalHours = diffMs / (1000 * 60 * 60);
    
    // حساب ساعات العمل العادية والإضافية
    // الدوام الرسمي: 8:30 AM إلى 7:00 PM (10.5 ساعة)
    const workStart = new Date(`${date} 08:30:00`);
    const workEnd = new Date(`${date} 19:00:00`); // 7:00 PM
    
    let regularHours = 0;
    let overtimeHours = 0;
    
    // حساب الساعات العادية (ضمن الدوام الرسمي)
    const actualStart = start < workStart ? workStart : start;
    const actualEnd = end > workEnd ? workEnd : end;
    
    if (actualEnd > actualStart) {
        regularHours = (actualEnd - actualStart) / (1000 * 60 * 60);
    }
    
    // حساب ساعات الإضافي (بعد 7:00 PM)
    if (end > workEnd) {
        overtimeHours = (end - workEnd) / (1000 * 60 * 60);
    }
    
    // حساب الساعات الفعالة (عادية + إضافي × 1.5)
    const effectiveHours = regularHours + (overtimeHours * 1.5);
    
    // إنشاء تفصيل الساعات
    let breakdown = '';
    if (regularHours > 0 && overtimeHours > 0) {
        breakdown = `عادي: ${regularHours.toFixed(1)}س + إضافي: ${overtimeHours.toFixed(1)}س (×1.5)`;
    } else if (regularHours > 0) {
        breakdown = `عادي: ${regularHours.toFixed(1)}س`;
    } else if (overtimeHours > 0) {
        breakdown = `إضافي: ${overtimeHours.toFixed(1)}س (×1.5)`;
    } else {
        breakdown = 'خارج ساعات العمل';
    }
    
    const result = {
        totalMs: diffMs,
        totalHours: totalHours, // إجمالي الساعات الفعلية
        regularHours: regularHours, // الساعات العادية
        overtimeHours: overtimeHours, // ساعات الإضافي
        effectiveHours: effectiveHours, // الساعات المحسوبة للراتب
        display: `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`,
        breakdown: breakdown
    };
    
    console.log('⏱️ نتيجة حساب الوقت مع الإضافي:', result);
    return result;
}

// دالة حساب المسافة بين نقطتين جغرافيتين (بالمتر)
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371e3; // نصف قطر الأرض بالمتر
    const φ1 = lat1 * Math.PI/180; // φ, λ بالراديان
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lng2-lng1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    const distance = R * c; // المسافة بالمتر
    return distance;
}

// دالة الحصول على الموقع الحالي
function getCurrentPosition() {
    return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
            reject(new Error('الجهاز لا يدعم تحديد الموقع'));
            return;
        }

        console.log('🔍 محاولة الحصول على الموقع...');
        
        // محاولة أولى مع دقة عالية
        navigator.geolocation.getCurrentPosition(
            (position) => {
                console.log('✅ تم الحصول على الموقع بدقة عالية:', position.coords);
                resolve(position);
            },
            (error) => {
                console.warn('⚠️ فشل في الحصول على موقع دقيق، محاولة بدقة أقل...', error);
                
                // محاولة ثانية بدقة أقل وسرعة أكبر
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        console.log('✅ تم الحصول على الموقع بدقة منخفضة:', position.coords);
                        resolve(position);
                    },
                    (fallbackError) => {
                        console.error('❌ فشل في الحصول على الموقع نهائياً:', fallbackError);
                        
                        let errorMessage = '';
                        switch(fallbackError.code) {
                            case fallbackError.PERMISSION_DENIED:
                                errorMessage = 'تم رفض الصلاحية للوصول للموقع.\n\nالحل:\n1. اضغط على أيقونة القفل بجانب رابط الموقع\n2. اختر "السماح" للموقع\n3. أعد تحميل الصفحة';
                                break;
                            case fallbackError.POSITION_UNAVAILABLE:
                                errorMessage = 'الموقع غير متاح حالياً.\n\nتأكد من:\n1. تفعيل GPS\n2. الاتصال بالإنترنت\n3. عدم استخدام VPN';
                                break;
                            case fallbackError.TIMEOUT:
                                errorMessage = 'انتهت مهلة تحديد الموقع.\n\nجرب:\n1. الخروج للمكان المفتوح\n2. إعادة المحاولة\n3. تحديث الصفحة';
                                break;
                            default:
                                errorMessage = 'خطأ غير معروف في تحديد الموقع';
                        }
                        
                        reject(new Error(errorMessage));
                    },
                    {
                        enableHighAccuracy: false, // دقة أقل للسرعة
                        timeout: 15000,           // مهلة أطول
                        maximumAge: 300000        // 5 دقائق cache
                    }
                );
            },
            {
                enableHighAccuracy: true,  // دقة عالية
                timeout: 8000,            // 8 ثواني
                maximumAge: 60000         // دقيقة واحدة cache
            }
        );
    });
}

// عرض الوقت الحالي
function updateCurrentTime() {
    const now = new Date();
    const timeElement = document.getElementById('currentTime');
    const dateElement = document.getElementById('currentDate');
    
    if (timeElement) {
        timeElement.textContent = now.toLocaleTimeString('ar-SA');
    }
    if (dateElement) {
        dateElement.textContent = formatDate(now);
    }
}

// تشغيل تحديث الوقت كل ثانية
setInterval(updateCurrentTime, 1000);

// مزامنة البيانات تلقائياً كل 5 دقائق
let syncInterval;
function startDataSync() {
    if (checkIfUsingSupabase()) {
        syncInterval = setInterval(async () => {
            console.log('🔄 مزامنة تلقائية للبيانات...');
            await loadDataFromSupabase();
        }, 5 * 60 * 1000); // كل 5 دقائق
        
        console.log('✅ تم تفعيل المزامنة التلقائية (كل 5 دقائق)');
    }
}

function stopDataSync() {
    if (syncInterval) {
        clearInterval(syncInterval);
        syncInterval = null;
        console.log('⏸️ تم إيقاف المزامنة التلقائية');
    }
}

// تحميل البيانات من Supabase عند بدء التطبيق
async function loadDataFromSupabase() {
    if (!checkIfUsingSupabase()) {
        console.log('🔄 Supabase غير مُعدّ، استخدام البيانات المحلية');
        return;
    }
    
    try {
        console.log('🔄 تحميل البيانات من Supabase...');
        
        // تحميل الموظفين
        const employeesData = await supabaseManager.getAllEmployees();
        if (employeesData && employeesData.length > 0) {
            // دمج مع الموظفين المحليين (المدير)
            const localAdminOnly = employees.filter(emp => emp.id === 'admin');
            employees = [...localAdminOnly, ...employeesData];
            console.log(`✅ تم تحميل ${employeesData.length} موظف من Supabase`);
        }
        
        // تحميل الفروع
        const branchesData = await supabaseManager.getAllBranches();
        if (branchesData && branchesData.length > 0) {
            branches = branchesData;
            console.log(`✅ تم تحميل ${branchesData.length} فرع من Supabase`);
        }
        
        // تحميل سجلات الحضور
        const attendanceData = await supabaseManager.getAllAttendance();
        if (attendanceData && attendanceData.length > 0) {
            attendance = attendanceData;
            console.log(`✅ تم تحميل ${attendanceData.length} سجل حضور من Supabase`);
        }
        
        // تحميل السجلات المالية
        const financesData = await supabaseManager.getAllFinances();
        if (financesData && financesData.length > 0) {
            finances = financesData;
            console.log(`✅ تم تحميل ${financesData.length} سجل مالي من Supabase`);
        }
        
        // حفظ البيانات المحدثة محلياً
        saveData();
        
        // تصحيح أي بيانات حضور بصيغة الوقت العربية
        let fixedCount = 0;
        attendance.forEach(att => {
            if (att.checkIn && (att.checkIn.includes('ص') || att.checkIn.includes('م'))) {
                try {
                    const tempDate = new Date(`2000-01-01 ${att.checkIn}`);
                    att.checkInDisplay = att.checkIn;
                    att.checkIn = tempDate.toTimeString().slice(0, 8);
                    fixedCount++;
                } catch (error) {
                    console.warn('خطأ في تحويل وقت الحضور:', att.checkIn);
                }
            }
            if (att.checkOut && (att.checkOut.includes('ص') || att.checkOut.includes('م'))) {
                try {
                    const tempDate = new Date(`2000-01-01 ${att.checkOut}`);
                    att.checkOutDisplay = att.checkOut;
                    att.checkOut = tempDate.toTimeString().slice(0, 8);
                    fixedCount++;
                } catch (error) {
                    console.warn('خطأ في تحويل وقت الانصراف:', att.checkOut);
                }
            }
        });
        
        if (fixedCount > 0) {
            saveData();
            console.log(`🔧 تم تصحيح ${fixedCount} حقل وقت من الصيغة العربية`);
        }
        
        console.log('✅ تم تحميل جميع البيانات من Supabase بنجاح');
        
        // تفعيل المزامنة التلقائية
        startDataSync();
        
    } catch (error) {
        console.error('❌ خطأ في تحميل البيانات من Supabase:', error);
        console.log('🔄 استخدام البيانات المحلية المتاحة');
    }
}

// إعادة تحميل البيانات يدوياً
async function reloadDataFromSupabase() {
    try {
        console.log('🔄 إعادة تحميل البيانات من Supabase...');
        
        // إيقاف المزامنة التلقائية مؤقتاً
        stopDataSync();
        
        // تحميل البيانات
        await loadDataFromSupabase();
        
        // تحديث الواجهات
        if (currentUser && currentUser.role === 'manager') {
            loadEmployeesList();
            loadFinanceEmployeeSelect();
            loadFinancesList();
            loadBranchesList();
            loadBranchesSelect();
        } else if (currentUser) {
            loadEmployeeAttendance();
            updateTodayStatus();
        }
        
        console.log('✅ تم إعادة تحميل البيانات وتحديث الواجهات');
        
        // إظهار رسالة نجاح
        showTemporaryMessage('✅ تم تحديث البيانات من Supabase', 'success');
        
    } catch (error) {
        console.error('❌ خطأ في إعادة تحميل البيانات:', error);
        showTemporaryMessage('❌ فشل في تحديث البيانات', 'error');
    }
}

// عرض رسالة مؤقتة
function showTemporaryMessage(message, type = 'info') {
    const messageDiv = document.createElement('div');
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: bold;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        transition: all 0.3s ease;
    `;
    
    const colors = {
        success: 'linear-gradient(135deg, #28a745, #20c997)',
        error: 'linear-gradient(135deg, #dc3545, #e74c3c)',
        warning: 'linear-gradient(135deg, #ffc107, #fd7e14)',
        info: 'linear-gradient(135deg, #17a2b8, #007bff)'
    };
    
    messageDiv.style.background = colors[type] || colors.info;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.style.opacity = '0';
        setTimeout(() => {
            document.body.removeChild(messageDiv);
        }, 300);
    }, 3000);
}

// تسجيل الدخول
document.addEventListener('DOMContentLoaded', async function() {
    // تحميل البيانات من Supabase أولاً
    await loadDataFromSupabase();
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        // محاولة تسجيل الدخول من Supabase أولاً
        let user = null;
        
        if (checkIfUsingSupabase() && supabaseManager.isConnected) {
            console.log('🔐 محاولة تسجيل الدخول من Supabase...');
            user = await authenticateFromSupabase(username, password);
        }
        
        // إذا فشل Supabase، البحث في البيانات المحلية
        if (!user) {
            console.log('🔐 البحث في البيانات المحلية...');
            user = employees.find(emp => emp.username === username && emp.password === password);
        }
        
        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            
            console.log('✅ تم تسجيل الدخول بنجاح:', user.name);
            
            if (user.role === 'manager') {
                showManagerDashboard();
            } else {
                showEmployeeDashboard();
            }
            
            document.getElementById('loginContainer').style.display = 'none';
            document.getElementById('errorMessage').textContent = '';
        } else {
            console.log('❌ فشل تسجيل الدخول');
            document.getElementById('errorMessage').textContent = 'اسم المستخدم أو كلمة المرور غير صحيحة';
        }
    });
});

// دالة تسجيل الدخول من Supabase
async function authenticateFromSupabase(username, password) {
    try {
        if (!supabaseManager || !supabaseManager.isConnected) {
            console.log('⚠️ Supabase غير متصل');
            return null;
        }
        
        const { data, error } = await supabaseManager.supabase
            .from('employees')
            .select('*')
            .eq('username', username)
            .eq('password', password)
            .single();
        
        if (error) {
            if (error.code === 'PGRST116') {
                console.log('❌ لم يتم العثور على المستخدم في Supabase');
                return null;
            }
            throw error;
        }
        
        if (data) {
            console.log('✅ تم العثور على المستخدم في Supabase:', data.name);
            
            // تحويل البيانات للصيغة المطلوبة
            return {
                id: data.id,
                name: data.name,
                username: data.username,
                password: data.password,
                position: data.position,
                salary: data.salary,
                currency: data.currency,
                branchId: data.branch_id,
                role: data.role
            };
        }
        
        return null;
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول من Supabase:', error);
        return null;
    }
}

// عرض لوحة تحكم المدير
function showManagerDashboard() {
    document.getElementById('managerDashboard').style.display = 'block';
    loadEmployeesList();
    loadFinanceEmployeeSelect();
    loadFinancesList();
    loadBranchesList();
    loadBranchesSelect();
    loadBranchesForWiFiManagement(); // تحديث قائمة الفروع لإدارة WiFi
    updateBranchQRList(); // تحديث قائمة QR Codes
    
    // تفعيل النظام التلقائي لـ QR Codes (إذا أردت)
    // setupDailyQRGeneration();
    
    // إضافة مستمعي الأحداث
    document.getElementById('addEmployeeForm').addEventListener('submit', addEmployee);
    document.getElementById('financeForm').addEventListener('submit', addFinanceRecord);
    document.getElementById('addBranchForm').addEventListener('submit', addBranch);
}

// عرض لوحة تحكم الموظف
function showEmployeeDashboard() {
    document.getElementById('employeeDashboard').style.display = 'block';
    document.getElementById('employeeName').textContent = currentUser.name;
    document.getElementById('employeePosition').textContent = currentUser.position;
    
    loadEmployeeAttendance();
    updateTodayStatus();
    updateCurrentTime();
    
    // فحص الموقع عند تحميل الواجهة
    setTimeout(() => {
        checkEmployeeLocationOnLoad();
    }, 1000);
    
    // تهيئة البيانات المالية للموظف
    setTimeout(() => {
        initializeEmployeeFinancialData();
    }, 1500);
    
    // إصلاح فوري للبيانات المالية - إجباري
    setTimeout(() => {
        forceFixFinancialDisplay();
    }, 2000);
}

// تم حذف تهيئة التوصية الذكية - النظام يستخدم الموقع الجغرافي فقط

// تسجيل خروج
function logout() {
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('managerDashboard').style.display = 'none';
    document.getElementById('employeeDashboard').style.display = 'none';
    
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';
}

// التبديل بين التبويبات
function showTab(tabName) {
    // إخفاء جميع محتويات التبويبات
    const tabs = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // إزالة التمييز من جميع أزرار التبويبات
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => btn.classList.remove('active'));
    
    // عرض التبويب المحدد
    document.getElementById(tabName).classList.add('active');
    event.target.classList.add('active');
}

// إضافة موظف جديد
async function addEmployee(e) {
    e.preventDefault();
    
    const employee = {
        id: generateTempId(), // سيتم استبداله بـ UUID من Supabase
        name: document.getElementById('empName').value,
        username: document.getElementById('empUsername').value,
        password: document.getElementById('empPassword').value,
        position: document.getElementById('empPosition').value,
        salary: parseFloat(document.getElementById('empSalary').value),
        currency: document.getElementById('empCurrency').value,
        branchId: document.getElementById('empBranch').value,
        role: 'employee'
    };
    
    // التحقق من عدم تكرار اسم المستخدم
    if (employees.find(emp => emp.username === employee.username)) {
        alert('اسم المستخدم موجود بالفعل');
        return;
    }
    
    // حفظ في قاعدة البيانات النشطة أولاً
    const savedEmployee = await saveToActiveDatabase('employee', employee);
    
    if (savedEmployee && savedEmployee.id) {
        // استخدام UUID الذي أرجعه Supabase
        employee.id = savedEmployee.id;
    }
    
    employees.push(employee);
    saveData();
    
    loadEmployeesList();
    loadFinanceEmployeeSelect();
    
    // مسح النموذج
    document.getElementById('addEmployeeForm').reset();
    alert('تم إضافة الموظف بنجاح');
}

// تحميل قائمة الموظفين
function loadEmployeesList() {
    const tbody = document.getElementById('employeesTableBody');
    tbody.innerHTML = '';
    
    employees.filter(emp => emp.role !== 'manager').forEach(employee => {
        const currencySymbol = getCurrencySymbol(employee.currency || 'SAR');
        const branch = branches.find(b => b.id === employee.branchId);
        const branchName = branch ? branch.name : 'غير محدد';
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${employee.name}</td>
            <td>${employee.position}</td>
            <td>${employee.salary.toLocaleString()} ${currencySymbol}</td>
            <td>${employee.currency || 'SAR'}</td>
            <td>${branchName}</td>
            <td>
                <button class="action-btn delete" onclick="deleteEmployee('${employee.id}')">حذف</button>
            </td>
        `;
    });
}

// حذف موظف
async function deleteEmployee(id) {
    if (confirm('هل أنت متأكد من حذف هذا الموظف؟ سيتم حذف جميع بيانات الحضور والعمليات المالية المرتبطة به.')) {
        // محاولة الحذف من Supabase أولاً
        if (checkIfUsingSupabase() && supabaseManager.isConnected) {
            console.log('🗑️ حذف الموظف من Supabase...');
            const deleted = await supabaseManager.deleteEmployee(id);
            
            if (!deleted) {
                alert('❌ فشل في حذف الموظف من قاعدة البيانات. يرجى المحاولة مرة أخرى.');
                return;
            }
        }
        
        // الحذف المحلي
        employees = employees.filter(emp => emp.id !== id);
        attendance = attendance.filter(att => att.employeeId !== id);
        finances = finances.filter(fin => fin.employeeId !== id);
        saveData();
        loadEmployeesList();
        loadFinanceEmployeeSelect();
        
        console.log('✅ تم حذف الموظف من البيانات المحلية');
        alert('✅ تم حذف الموظف بنجاح');
    }
}

// تسجيل الحضور
async function checkIn() {
    const today = getLocalDateISO(); // استخدام التاريخ المحلي بدلاً من UTC
    const existingAttendance = attendance.find(att => 
        att.employeeId === currentUser.id && att.date === today
    );
    
    if (existingAttendance && existingAttendance.checkIn) {
        alert('لقد سجلت الحضور بالفعل اليوم');
        return;
    }
    
    // التحقق من الموقع الجغرافي
    const locationCheck = await validateEmployeeLocation();
    if (!locationCheck.valid) {
        updateLocationStatus(locationCheck.message, 'error');
        alert(locationCheck.message);
        return;
    }
    
    const now = new Date();
    const attendanceRecord = {
        id: generateTempId(), // سيتم استبداله بـ UUID من Supabase
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        date: today,
        checkIn: now.toTimeString().slice(0, 8), // تنسيق 24 ساعة للـ DB
        checkInDisplay: now.toLocaleTimeString('ar-SA'), // للعرض في الواجهة
        checkOut: null,
        totalHours: 0,
        location: locationCheck.branchName,
        distance: locationCheck.distance
    };
    
    // التحقق من صحة بيانات المستخدم
    console.log('🔍 فحص بيانات المستخدم الحالي:', currentUser);
    
    if (!currentUser.id || currentUser.id.toString().match(/^\d{13,}$/)) {
        console.error('❌ معرف المستخدم غير صحيح:', currentUser.id);
        alert('خطأ: معرف المستخدم غير صحيح. يرجى إعادة تسجيل الدخول.');
        return;
    }
    
    // حفظ في قاعدة البيانات النشطة أولاً
    console.log('💾 محاولة حفظ الحضور في قاعدة البيانات...', {
        employeeId: attendanceRecord.employeeId,
        employeeName: attendanceRecord.employeeName,
        date: attendanceRecord.date,
        checkIn: attendanceRecord.checkIn,
        checkInDisplay: attendanceRecord.checkInDisplay
    });
    
    const savedAttendance = await saveToActiveDatabase('attendance', attendanceRecord);
    
    if (savedAttendance && savedAttendance.id) {
        // استخدام UUID الذي أرجعه Supabase
        attendanceRecord.id = savedAttendance.id;
        console.log('✅ تم حفظ الحضور في قاعدة البيانات بـ ID:', savedAttendance.id);
        showTemporaryMessage('✅ تم حفظ الحضور في قاعدة البيانات', 'success');
    } else {
        console.log('⚠️ تم حفظ الحضور محلياً فقط');
        showTemporaryMessage('⚠️ تم حفظ الحضور محلياً فقط', 'warning');
    }
    
    attendance.push(attendanceRecord);
    saveData();
    loadEmployeeAttendance();
    updateTodayStatus();
    updateLocationStatus(`تم تسجيل الحضور من ${locationCheck.branchName}`, 'success');
    alert('تم تسجيل الحضور بنجاح');
}

// تسجيل الانصراف
async function checkOut() {
    const today = getLocalDateISO(); // استخدام التاريخ المحلي بدلاً من UTC
    const todayAttendance = attendance.find(att => 
        att.employeeId === currentUser.id && att.date === today
    );
    
    if (!todayAttendance || !todayAttendance.checkIn) {
        alert('يجب تسجيل الحضور أولاً');
        return;
    }
    
    if (todayAttendance.checkOut) {
        alert('لقد سجلت الانصراف بالفعل اليوم');
        return;
    }
    
    // التحقق من الموقع الجغرافي
    const locationCheck = await validateEmployeeLocation();
    if (!locationCheck.valid) {
        updateLocationStatus(locationCheck.message, 'error');
        alert(locationCheck.message);
        return;
    }
    
    const now = new Date();
    todayAttendance.checkOut = now.toTimeString().slice(0, 8); // تنسيق 24 ساعة للـ DB
    todayAttendance.checkOutDisplay = now.toLocaleTimeString('ar-SA'); // للعرض في الواجهة
    
    // حساب إجمالي الوقت بدقة
    const timeCalculation = calculatePreciseTime(todayAttendance.checkIn, todayAttendance.checkOut, today);
    todayAttendance.totalHours = timeCalculation.totalHours;
    todayAttendance.timeDisplay = timeCalculation.display;
    
    console.log('🔢 حساب وقت العمل:', {
        checkIn: todayAttendance.checkIn,
        checkInDisplay: todayAttendance.checkInDisplay,
        checkOut: todayAttendance.checkOut,
        checkOutDisplay: todayAttendance.checkOutDisplay,
        totalHours: timeCalculation.totalHours.toFixed(2),
        display: timeCalculation.display
    });
    
    // تحديث في قاعدة البيانات النشطة
    console.log('💾 محاولة تحديث الانصراف في قاعدة البيانات...');
    console.log('📊 بيانات الانصراف المُرسلة:', {
        id: todayAttendance.id,
        employeeId: todayAttendance.employeeId,
        date: todayAttendance.date,
        checkOut: todayAttendance.checkOut,
        totalHours: todayAttendance.totalHours
    });
    
    const updatedAttendance = await saveToActiveDatabase('attendance', todayAttendance);
    
    if (updatedAttendance) {
        console.log('✅ تم تحديث الانصراف في قاعدة البيانات');
        showTemporaryMessage('✅ تم حفظ الانصراف في قاعدة البيانات', 'success');
    } else {
        console.log('⚠️ تم تحديث الانصراف محلياً فقط');
        showTemporaryMessage('⚠️ تم حفظ الانصراف محلياً فقط', 'warning');
    }
    
    saveData();
    loadEmployeeAttendance();
    updateTodayStatus();
    updateLocationStatus(`تم تسجيل الانصراف من ${locationCheck.branchName}`, 'success');
    alert('تم تسجيل الانصراف بنجاح');
}

// تحديث حالة اليوم
function updateTodayStatus() {
    const today = getLocalDateISO(); // استخدام التاريخ المحلي بدلاً من UTC
    const todayAttendance = attendance.find(att => 
        att.employeeId === currentUser.id && att.date === today
    );
    
    const statusElement = document.getElementById('todayStatus');
    
    if (!todayAttendance || !todayAttendance.checkIn) {
        statusElement.innerHTML = 'لم يتم تسجيل الحضور اليوم';
        statusElement.className = 'today-status';
    } else if (!todayAttendance.checkOut) {
        statusElement.innerHTML = `تم تسجيل الحضور في: ${todayAttendance.checkInDisplay || todayAttendance.checkIn}`;
        statusElement.className = 'today-status';
    } else {
        const timeDisplay = todayAttendance.timeDisplay || `${todayAttendance.totalHours.toFixed(2)} ساعة`;
        statusElement.innerHTML = `
            الحضور: ${todayAttendance.checkInDisplay || todayAttendance.checkIn}<br>
            الانصراف: ${todayAttendance.checkOutDisplay || todayAttendance.checkOut}<br>
            إجمالي الوقت: ${timeDisplay}
        `;
        statusElement.className = 'today-status';
    }
}

// تحميل سجل حضور الموظف
function loadEmployeeAttendance() {
    const tbody = document.getElementById('attendanceTableBody');
    tbody.innerHTML = '';
    
    const employeeAttendance = attendance
        .filter(att => att.employeeId === currentUser.id)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    let hasUpdates = false;
    
    employeeAttendance.forEach(record => {
        // إعادة حساب الوقت بدقة للسجلات القديمة
        let timeDisplay = '-';
        let totalHours = 0;
        
        // إنشاء display fields للبيانات القديمة
        if (record.checkIn && !record.checkInDisplay) {
            if (record.checkIn.includes('ص') || record.checkIn.includes('م')) {
                record.checkInDisplay = record.checkIn; // إذا كان بالفعل عربي
            } else {
                // تحويل من 24 ساعة إلى عربي
                record.checkInDisplay = new Date(`2000-01-01 ${record.checkIn}`).toLocaleTimeString('ar-SA');
            }
            hasUpdates = true;
        }
        
        if (record.checkOut && !record.checkOutDisplay) {
            if (record.checkOut.includes('ص') || record.checkOut.includes('م')) {
                record.checkOutDisplay = record.checkOut; // إذا كان بالفعل عربي
            } else {
                // تحويل من 24 ساعة إلى عربي
                record.checkOutDisplay = new Date(`2000-01-01 ${record.checkOut}`).toLocaleTimeString('ar-SA');
            }
            hasUpdates = true;
        }
        
        if (record.checkIn && record.checkOut) {
            if (!record.timeDisplay || !record.totalHours) {
                // حساب الوقت إذا لم يكن محسوباً من قبل
                const timeCalculation = calculatePreciseTime(record.checkIn, record.checkOut, record.date);
                record.totalHours = timeCalculation.totalHours;
                record.timeDisplay = timeCalculation.display;
                hasUpdates = true;
                
                console.log(`🔢 حساب الوقت للسجل ${record.date}: ${timeCalculation.display} (${timeCalculation.totalHours.toFixed(2)} ساعة)`);
            }
            
            timeDisplay = record.timeDisplay;
            totalHours = record.totalHours;
        }
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${formatDate(record.date)}</td>
            <td>${record.checkInDisplay || record.checkIn || '-'}</td>
            <td>${record.checkOutDisplay || record.checkOut || '-'}</td>
            <td><strong>${timeDisplay}</strong></td>
        `;
        
        // تلوين الصف حسب الحالة
        if (record.checkIn && record.checkOut) {
            row.style.backgroundColor = '#e8f5e8'; // أخضر فاتح للمكتمل
        } else if (record.checkIn && !record.checkOut) {
            row.style.backgroundColor = '#fff3e0'; // برتقالي فاتح للحضور بدون انصراف
        }
    });
    
    // حفظ التحديثات إذا حُسبت أوقات جديدة
    if (hasUpdates) {
        saveData();
        console.log('✅ تم تحديث حسابات الوقت وحفظها');
    }
}

// إنشاء التقرير الأسبوعي
function generateWeeklyReport() {
    const weekInput = document.getElementById('reportWeek').value;
    if (!weekInput) {
        alert('يرجى اختيار الأسبوع');
        return;
    }
    
    const [year, week] = weekInput.split('-W');
    const startDate = getDateOfWeek(year, week);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const tbody = document.getElementById('weeklyReportTableBody');
    tbody.innerHTML = '';
    
    // إخفاء تفاصيل الموظف إذا كانت مفتوحة
    document.getElementById('employeeDetailSection').style.display = 'none';
    
    // إضافة ملاحظة عن النظام الجديد
    console.log('📅 النظام الجديد: الأسبوع من السبت إلى الخميس (الجمعة عطلة)');
    console.log(`📊 تقرير الأسبوع ${weekInput}: من ${formatDate(startDate)} إلى ${formatDate(endDate)}`);
    
    employees.filter(emp => emp.role !== 'manager').forEach(employee => {
        const weekAttendance = attendance.filter(att => {
            const attDate = new Date(att.date);
            return att.employeeId === employee.id && 
                   attDate >= startDate && attDate <= endDate;
        });
        
        // حساب إجمالي الوقت بدقة
        let totalHours = 0;
        let totalTimeDisplay = '00:00:00';
        
        weekAttendance.forEach(att => {
            if (att.checkIn && att.checkOut) {
                if (!att.timeDisplay) {
                    const timeCalc = calculatePreciseTime(att.checkIn, att.checkOut, att.date);
                    att.totalHours = timeCalc.totalHours;
                    att.timeDisplay = timeCalc.display;
                }
                totalHours += att.totalHours;
            }
        });
        
        // تحويل إجمالي الساعات إلى تنسيق الوقت
        const totalSeconds = Math.floor(totalHours * 3600);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        totalTimeDisplay = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        const workDays = weekAttendance.filter(att => att.checkIn && att.checkOut).length;
        
        // حساب الراتب بالساعة مع دعم الإضافي (الطريقة الجديدة: الراتب ÷ 6 أيام ÷ 10.5 ساعة)
        const dailyRate = employee.salary / 6; // حساب اليوم
        const hourlyRate = dailyRate / 10.5; // معدل الساعة العادية
        
        // حساب إجمالي الساعات الفعالة (عادية + إضافي × 1.5)
        let totalEffectiveHours = 0;
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        
        weekAttendance.forEach(att => {
            if (att.checkIn && att.checkOut) {
                // إعادة حساب الوقت لكل يوم
                const timeCalc = calculatePreciseTime(att.checkIn, att.checkOut, att.date);
                totalEffectiveHours += timeCalc.effectiveHours || 0;
                totalRegularHours += timeCalc.regularHours || 0;
                totalOvertimeHours += timeCalc.overtimeHours || 0;
            }
        });
        
        const weeklyEarnings = totalEffectiveHours * hourlyRate;
        
        // معالجة العمليات المالية للأسبوع الحالي
        const weekFinances = finances.filter(fin => {
            const finDate = new Date(fin.date);
            return fin.employeeId === employee.id && 
                   finDate >= startDate && finDate <= endDate;
        });
        
        const weekDeductions = weekFinances
            .filter(fin => fin.type === 'deduction')
            .reduce((sum, fin) => sum + fin.amount, 0);
            
        // السلف: تُحسب من تاريخ الدفع للأسبوع المقبل
        const weekAdvances = weekFinances
            .filter(fin => fin.type === 'advance')  
            .reduce((sum, fin) => sum + fin.amount, 0);
            
        // السلف من الأسبوع السابق (إذا كان هناك سلف مؤجل)
        const previousWeekStart = new Date(startDate);
        previousWeekStart.setDate(previousWeekStart.getDate() - 7);
        const previousWeekEnd = new Date(endDate);
        previousWeekEnd.setDate(previousWeekEnd.getDate() - 7);
        
        const previousWeekAdvances = finances.filter(fin => {
            const finDate = new Date(fin.date);
            return fin.employeeId === employee.id && 
                   fin.type === 'advance' &&
                   finDate >= previousWeekStart && finDate <= previousWeekEnd;
        }).reduce((sum, fin) => sum + fin.amount, 0);
            
        // المدفوعات السابقة لهذا الأسبوع
        const weekPayments = weekFinances
            .filter(fin => fin.type === 'payment' && fin.weekPaid === weekInput)
            .reduce((sum, fin) => sum + fin.amount, 0);
        
        // حساب المبلغ الصافي (بعد خصم المدفوعات السابقة والسلف المؤجلة)
        const totalAdvances = weekAdvances + previousWeekAdvances;
        const grossEarnings = weeklyEarnings - weekDeductions - totalAdvances;
        const netEarnings = grossEarnings - weekPayments;
        const currencySymbol = getCurrencySymbol(employee.currency || 'SAR');
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><strong>${employee.name}</strong></td>
            <td>${employee.position}</td>
            <td>${employee.salary.toLocaleString()} ${currencySymbol}</td>
            <td>${employee.currency || 'SAR'}</td>
            <td><strong>${totalTimeDisplay}</strong></td>
            <td><strong>${workDays}</strong> يوم</td>
            <td><strong>${netEarnings.toFixed(2)}</strong> ${currencySymbol}</td>
            <td>
                <button class="action-btn" onclick="showDetailedEmployeeReport('${employee.id}', '${weekInput}')">
                    عرض التفاصيل الكاملة
                </button>
                ${netEarnings > 0 ? `<br><button class="action-btn shahba-btn-secondary" style="margin-top: 5px;" onclick="markSalaryAsPaid('${employee.id}', '${weekInput}', ${netEarnings.toFixed(2)}, '${currencySymbol}')">💰 تم التسليم</button>` : ''}
            </td>
        `;
    });
}

// الحصول على تاريخ بداية الأسبوع العربي (السبت) - النسخة المحسنة
function getDateOfWeek(year, week) {
    // تحويل رقم الأسبوع إلى عدد صحيح
    const weekNumber = parseInt(week);
    
    // العثور على 4 يناير من السنة المحددة (دائماً في الأسبوع الأول)
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay(); // 0=أحد, 1=اثنين, ..., 6=سبت
    
    // حساب عدد الأيام إلى أقرب سبت قبل أو في 4 يناير
    // في النظام العربي: السبت = 6, الأحد = 0, الاثنين = 1, ..., الجمعة = 5
    const daysToSaturday = (6 - jan4Day + 7) % 7;
    
    // تاريخ السبت الأول (بداية الأسبوع الأول)
    const firstSaturday = new Date(jan4);
    firstSaturday.setDate(jan4.getDate() - daysToSaturday);
    
    // حساب بداية الأسبوع المطلوب
    const targetWeekStart = new Date(firstSaturday);
    targetWeekStart.setDate(firstSaturday.getDate() + (weekNumber - 1) * 7);
    
    return targetWeekStart;
}

// إضافة خصم أو سلفة
async function addFinanceRecord(e) {
    e.preventDefault();
    
    const financeRecord = {
        id: generateTempId(), // سيتم استبداله بـ UUID من Supabase
        employeeId: document.getElementById('financeEmployee').value,
        employeeName: employees.find(emp => emp.id === document.getElementById('financeEmployee').value).name,
        type: document.getElementById('financeType').value,
        amount: parseFloat(document.getElementById('financeAmount').value),
        reason: document.getElementById('financeReason').value,
        date: new Date().toISOString().split('T')[0] // حفظ بتنسيق ISO للتوافق مع قاعدة البيانات
    };
    
    // حفظ في قاعدة البيانات النشطة أولاً
    const savedFinance = await saveToActiveDatabase('finance', financeRecord);
    
    if (savedFinance && savedFinance.id) {
        // استخدام UUID الذي أرجعه Supabase
        financeRecord.id = savedFinance.id;
    }
    
    finances.push(financeRecord);
    saveData();
    loadFinancesList();
    
    document.getElementById('financeForm').reset();
    alert('تم إضافة العملية بنجاح');
}

// تحميل قائمة الموظفين في الشؤون المالية
function loadFinanceEmployeeSelect() {
    const select = document.getElementById('financeEmployee');
    select.innerHTML = '<option value="">اختر موظف</option>';
    
    employees.filter(emp => emp.role !== 'manager').forEach(employee => {
        const option = document.createElement('option');
        option.value = employee.id;
        option.textContent = employee.name;
        select.appendChild(option);
    });
}

// تحميل قائمة الخصومات والسلف
function loadFinancesList() {
    const tbody = document.getElementById('financeTableBody');
    tbody.innerHTML = '';
    
    finances.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(record => {
        // العثور على العملة من بيانات الموظف
        const employee = employees.find(emp => emp.id === record.employeeId);
        const currencySymbol = getCurrencySymbol(employee?.currency || 'SAR');
        
        // تحديد نوع العملية ولونها
        let typeText, typeColor;
        if (record.type === 'deduction') {
            typeText = 'خصم';
            typeColor = '#dc3545';
        } else if (record.type === 'advance') {
            typeText = 'سلفة';
            typeColor = '#007bff';
        } else if (record.type === 'payment') {
            typeText = 'تسليم راتب';
            typeColor = '#28a745';
        } else {
            typeText = record.type;
            typeColor = '#6c757d';
        }
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${record.employeeName}</td>
            <td><span style="color: ${typeColor}; font-weight: bold;">${typeText}</span></td>
            <td>${record.amount.toLocaleString()} ${currencySymbol}</td>
            <td>${record.reason}</td>
            <td>${formatDate(record.date)}</td>
            <td>
                <button class="action-btn delete" onclick="deleteFinance('${record.id}')">حذف</button>
            </td>
        `;
    });
}

// حذف عملية مالية
async function deleteFinance(id) {
    const record = finances.find(f => f.id === id);
    if (!record) {
        alert('العملية المالية غير موجودة');
        return;
    }
    
    // تحديد نوع العملية للرسالة
    let typeText;
    if (record.type === 'deduction') {
        typeText = 'خصم';
    } else if (record.type === 'advance') {
        typeText = 'سلفة';
    } else if (record.type === 'payment') {
        typeText = 'تسليم راتب';
    } else {
        typeText = 'عملية مالية';
    }
    
    if (confirm(`هل أنت متأكد من حذف ${typeText} بقيمة ${record.amount} للموظف ${record.employeeName}؟`)) {
        // محاولة الحذف من Supabase أولاً
        if (checkIfUsingSupabase() && supabaseManager.isConnected) {
            console.log('🗑️ حذف العملية المالية من Supabase...');
            const deleted = await supabaseManager.deleteFinance(id);
            
            if (!deleted) {
                alert('❌ فشل في حذف العملية المالية من قاعدة البيانات. يرجى المحاولة مرة أخرى.');
                return;
            }
        }
        
        // الحذف المحلي
        finances = finances.filter(f => f.id !== id);
        saveData();
        loadFinancesList();
        
        console.log('✅ تم حذف العملية المالية من البيانات المحلية');
        alert('✅ تم حذف العملية المالية بنجاح');
    }
}

// حفظ البيانات في localStorage
function saveData() {
    localStorage.setItem('employees', JSON.stringify(employees));
    localStorage.setItem('attendance', JSON.stringify(attendance));
    localStorage.setItem('finances', JSON.stringify(finances));
    localStorage.setItem('branches', JSON.stringify(branches));
}

// تحديد قاعدة البيانات المستخدمة
function getActiveDatabase() {
    // التحقق من وجود إعدادات Supabase صحيحة
    if (!checkIfUsingSupabase()) {
        console.log('💽 استخدام التخزين المحلي - Supabase غير مُعدّ');
        return 'local';
    }
    
    // التحقق من وجود supabaseManager
    if (typeof supabaseManager === 'undefined' || !supabaseManager) {
        console.log('💽 استخدام التخزين المحلي - supabaseManager غير موجود');
        return 'local';
    }
    
    // التحقق من وجود كائن supabase
    if (!supabaseManager.supabase) {
        console.log('💽 استخدام التخزين المحلي - عميل Supabase غير مُهيأ');
        return 'local';
    }
    
    console.log('🚀 استخدام Supabase');
    return 'supabase';
}

// حفظ البيانات في قاعدة البيانات النشطة
async function saveToActiveDatabase(type, data) {
    const activeDb = getActiveDatabase();
    
    console.log(`🔍 قاعدة البيانات النشطة: ${activeDb}`);
    console.log(`💾 بيانات الحفظ:`, data);
    
    try {
        switch (activeDb) {
            case 'supabase':
                console.log(`🚀 محاولة حفظ ${type} في Supabase...`);
                
                // تجربة الاتصال أولاً
                const connectionTest = await supabaseManager.testConnection();
                if (!connectionTest) {
                    console.warn('⚠️ فشل اختبار الاتصال مع Supabase، الانتقال للحفظ المحلي');
                    return { id: data.id };
                }
                
                // تنظيف البيانات قبل الإرسال
                const cleanData = cleanDataForSupabase(data, type);
                
                switch (type) {
                    case 'employee':
                        const savedEmployee = await supabaseManager.saveEmployee(cleanData);
                        console.log('✅ تم حفظ الموظف في Supabase:', savedEmployee);
                        return savedEmployee;
                    case 'attendance':
                        const savedAttendance = await supabaseManager.saveAttendance(cleanData);
                        console.log('✅ تم حفظ الحضور في Supabase:', savedAttendance);
                        return savedAttendance;
                    case 'branch':
                        const savedBranch = await supabaseManager.saveBranch(cleanData);
                        console.log('✅ تم حفظ الفرع في Supabase:', savedBranch);
                        return savedBranch;
                    case 'finance':
                        const savedFinance = await supabaseManager.saveFinance(cleanData);
                        console.log('✅ تم حفظ العملية المالية في Supabase:', savedFinance);
                        return savedFinance;
                    default:
                        console.warn(`❌ نوع البيانات غير مدعوم: ${type}`);
                        return null;
                }
                
            default:
                // حفظ محلي فقط
                console.log(`💽 حفظ ${type} محلياً فقط - Supabase غير مُعدّ`);
                return { id: data.id };
        }
    } catch (error) {
        console.error(`❌ خطأ في حفظ ${type} في Supabase:`, error);
        console.log(`💽 التراجع للحفظ المحلي بسبب الخطأ`);
        
        // إظهار تحذير للمستخدم
        showTemporaryMessage(`⚠️ تم حفظ ${type} محلياً فقط - خطأ في قاعدة البيانات`, 'warning');
        
        return { id: data.id };
    }
}

// إنشاء ID مؤقت آمن للتخزين المحلي
function generateTempId() {
    // إنشاء UUID-like محلي آمن
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substring(2, 8);
    const random2 = Math.random().toString(36).substring(2, 8);
    const tempId = `local_${timestamp}_${random1}${random2}`;
    
    console.log('🆔 تم إنشاء معرف محلي:', tempId);
    return tempId;
}

// تنظيف البيانات المحلية من timestamp IDs - فقط إذا كان Supabase متصل
function cleanLocalData() {
    // عدم التنظيف إذا لم يكن Supabase مُعدّاً
    if (!checkIfUsingSupabase()) {
        console.log('📋 Supabase غير مُعدّ - تخطي تنظيف البيانات المحلية');
        return 0;
    }
    
    let cleanedCount = 0;
    
    // تنظيف الموظفين - أكثر حذراً
    const originalEmployeesCount = employees.length;
    employees = employees.filter(emp => {
        // الاحتفاظ بالمدير بكل الأحوال
        if (emp.id === 'admin' || emp.role === 'manager') {
            return true;
        }
        
        // فقط إزالة timestamp IDs الواضحة (أرقام طويلة)
        if (emp.id && emp.id.toString().match(/^\d{13,}$/)) {
            console.log(`حذف موظف بـ timestamp ID: ${emp.id} ${emp.name}`);
            cleanedCount++;
            return false;
        }
        
        // تنظيف branchId غير صحيح
        if (emp.branchId && emp.branchId.toString().match(/^\d{13,}$/)) {
            console.warn('تنظيف branchId غير صحيح للموظف:', emp.name);
            emp.branchId = ''; // حذف branchId غير صحيح
            cleanedCount++;
        }
        
        return true;
    });
    
    // تنظيف الحضور - فقط timestamp IDs واضحة
    const originalAttendanceCount = attendance.length;
    attendance = attendance.filter(att => {
        if (att.employeeId && att.employeeId.toString().match(/^\d{13,}$/)) {
            console.warn('حذف سجل حضور بـ employee_id غير صحيح:', att.employeeId);
            cleanedCount++;
            return false;
        }
        // تنظيف ID للسجل نفسه إذا كان timestamp
        if (att.id && att.id.toString().match(/^\d{13,}$/)) {
            att.id = generateTempId(); // إنشاء ID جديد
            cleanedCount++;
        }
        return true;
    });
    
    // تنظيف الشؤون المالية - فقط timestamp IDs واضحة
    const originalFinancesCount = finances.length;
    finances = finances.filter(fin => {
        if (fin.employeeId && fin.employeeId.toString().match(/^\d{13,}$/)) {
            console.warn('حذف عملية مالية بـ employee_id غير صحيح:', fin.employeeId);
            cleanedCount++;
            return false;
        }
        // تنظيف ID للسجل نفسه إذا كان timestamp
        if (fin.id && fin.id.toString().match(/^\d{13,}$/)) {
            fin.id = generateTempId(); // إنشاء ID جديد
            cleanedCount++;
        }
        return true;
    });
    
    // تنظيف الفروع - تحويل timestamp IDs إلى temp IDs
    branches = branches.map(branch => {
        if (branch.id && branch.id.toString().match(/^\d{13,}$/)) {
            console.warn('تنظيف timestamp ID للفرع:', branch.name);
            branch.id = generateTempId(); // إنشاء ID جديد
            cleanedCount++;
        }
        return branch;
    });
    
    if (cleanedCount > 0) {
        saveData();
        console.log(`✅ تم تنظيف ${cleanedCount} عنصر من البيانات المحلية`);
        
        // إحصائيات التنظيف
        const deletedEmployees = originalEmployeesCount - employees.length;
        const deletedAttendance = originalAttendanceCount - attendance.length;
        const deletedFinances = originalFinancesCount - finances.length;
        
        if (deletedEmployees > 0 || deletedAttendance > 0 || deletedFinances > 0) {
            console.log(`📊 إحصائيات التنظيف:
            - موظفين محذوفين: ${deletedEmployees}
            - سجلات حضور محذوفة: ${deletedAttendance} 
            - عمليات مالية محذوفة: ${deletedFinances}`);
        }
    } else {
        console.log('✅ البيانات المحلية نظيفة بالفعل');
    }
    
    return cleanedCount;
}

// تشغيل Supabase كافتراضي
function checkIfUsingSupabase() {
    const hasSupabaseConfig = SUPABASE_CONFIG && 
                             SUPABASE_CONFIG.url !== 'YOUR_SUPABASE_URL' && 
                             SUPABASE_CONFIG.anonKey !== 'YOUR_SUPABASE_ANON_KEY';
                             
    if (hasSupabaseConfig) {
        localStorage.setItem('use_supabase', 'true');
        return true;
    }
    
    return false;
}

// التحقق من المستخدم المحفوظ عند تحميل الصفحة
window.addEventListener('load', function() {
    // تنظيف البيانات المحلية من timestamp IDs
    cleanLocalData();
    
    // تشغيل Supabase تلقائياً إذا كان مُعداً
    checkIfUsingSupabase();
    
    // اختبار النظام الجديد
    console.log('🎉 تم تحميل النظام الجديد!');
    console.log('📅 الأسبوع العربي: السبت إلى الخميس (الجمعة عطلة)');
    
    // اختبار حساب الوقت
    const testTime24 = calculatePreciseTime('9:00:00', '17:30:00', '2024-01-01');
    console.log('⏱️ اختبار حساب الوقت (24 ساعة):', testTime24);
    
    // اختبار حساب الوقت العربي
    const testTimeArabic = calculatePreciseTime('٩:٠٠:٠٠ ص', '٥:٣٠:٠٠ م', '2024-01-01');
    console.log('⏱️ اختبار حساب الوقت (عربي):', testTimeArabic);
    
    // اختبار الأسبوع العربي
    const today = new Date();
    const currentWeekNumber = getWeekNumber(today);
    const currentWeekStart = getDateOfWeek(today.getFullYear(), currentWeekNumber);
    console.log('📊 الأسبوع الحالي:', {
        weekNumber: currentWeekNumber,
        weekStart: formatDate(currentWeekStart),
        weekEnd: formatDate(new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000))
    });
    
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        
        // التحقق من currentUser - إذا كان له timestamp ID، إعادة تسجيل الدخول
        if (currentUser.id && currentUser.id.toString().length > 20 && !currentUser.id.startsWith('temp_')) {
            console.warn('المستخدم الحالي له timestamp ID - إعادة تسجيل الدخول مطلوبة');
            localStorage.removeItem('currentUser');
            currentUser = null;
            return; // إظهار شاشة تسجيل الدخول
        }
        
        if (currentUser.role === 'manager') {
            showManagerDashboard();
        } else {
            showEmployeeDashboard();
        }
        
        document.getElementById('loginContainer').style.display = 'none';
    }
    
    // تعيين الأسبوع الحالي
    const now = new Date();
    const year = now.getFullYear();
    const weekNumForInput = getWeekNumber(now);
    const weekInput = document.getElementById('reportWeek');
    if (weekInput) {
        weekInput.value = `${year}-W${weekNumForInput.toString().padStart(2, '0')}`;
    }
});

// الحصول على رقم الأسبوع العربي (السبت = بداية الأسبوع) - النسخة المحسنة
function getWeekNumber(date) {
    const target = new Date(date.valueOf());
    const year = target.getFullYear();
    
    // العثور على 4 يناير من نفس السنة (دائماً في الأسبوع الأول)
    const jan4 = new Date(year, 0, 4);
    const jan4Day = jan4.getDay(); // 0=أحد, 1=اثنين, ..., 6=سبت
    
    // حساب عدد الأيام إلى أقرب سبت قبل أو في 4 يناير
    const daysToSaturday = (6 - jan4Day + 7) % 7;
    
    // تاريخ السبت الأول (بداية الأسبوع الأول)
    const firstSaturday = new Date(jan4);
    firstSaturday.setDate(jan4.getDate() - daysToSaturday);
    
    // العثور على السبت الذي يبدأ به الأسبوع المحتوي للتاريخ المطلوب
    const targetDay = target.getDay(); // 0=أحد, 1=اثنين, ..., 6=سبت
    const daysFromSaturday = (targetDay + 1) % 7; // كم يوم مضى منذ السبت
    
    const weekStart = new Date(target);
    weekStart.setDate(target.getDate() - daysFromSaturday);
    
    // حساب عدد الأسابيع من السبت الأول
    const timeDiff = weekStart.getTime() - firstSaturday.getTime();
    const weekNumber = Math.floor(timeDiff / (7 * 24 * 60 * 60 * 1000)) + 1;
    
    return Math.max(1, weekNumber);
}

// عرض التفاصيل الكاملة للموظف
function showDetailedEmployeeReport(employeeId, week) {
    const employee = employees.find(emp => emp.id === employeeId);
    const [year, weekNum] = week.split('-W');
    const startDate = getDateOfWeek(year, weekNum);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    // عرض قسم التفاصيل
    document.getElementById('employeeDetailSection').style.display = 'block';
    
    // تعبئة معلومات الموظف
    const currencySymbol = getCurrencySymbol(employee.currency || 'SAR');
    document.getElementById('detailEmployeeName').textContent = employee.name;
    document.getElementById('detailEmployeeInfo').textContent = 
        `${employee.position} - الراتب الشهري: ${employee.salary.toLocaleString()} ${currencySymbol}`;
    
    // الحصول على بيانات الحضور للأسبوع
    const weekAttendance = attendance.filter(att => {
        const attDate = new Date(att.date);
        return att.employeeId === employeeId && 
               attDate >= startDate && attDate <= endDate;
    });
    
    // حساب معدل الراتب بالساعة (الطريقة الجديدة)
    const dailyRate = employee.salary / 6; // حساب اليوم
    const hourlyRate = dailyRate / 10.5; // معدل الساعة
    
    // تعبئة جدول التفاصيل
    const tbody = document.getElementById('employeeDetailTableBody');
    tbody.innerHTML = '';
    
    let totalHours = 0;
    let totalEarnings = 0;
    let workDays = 0;
    
    // إنشاء مصفوفة لأيام الأسبوع العربي (السبت إلى الخميس)
    const weekDays = [];
    for (let i = 0; i < 7; i++) { // 7 أيام: السبت=0, الأحد=1, ..., الخميس=5, الجمعة=6
        const date = new Date(startDate);
        date.setDate(date.getDate() + i);
        weekDays.push(date);
    }
    
    weekDays.forEach((date, index) => {
        const dateStr = date.toISOString().split('T')[0];
        const dayAttendance = weekAttendance.find(att => att.date === dateStr);
        
        const dayName = date.toLocaleDateString('ar-SA', { weekday: 'long' });
        
        // حساب الوقت والأرباح للأيام
        let dayHours = 0;
        let dayTimeDisplay = '-';
        let dayEarnings = 0;
        
        if (dayAttendance && dayAttendance.checkIn && dayAttendance.checkOut) {
            if (!dayAttendance.timeDisplay) {
                const timeCalc = calculatePreciseTime(dayAttendance.checkIn, dayAttendance.checkOut, dateStr);
                dayAttendance.totalHours = timeCalc.totalHours;
                dayAttendance.timeDisplay = timeCalc.display;
            }
            dayHours = dayAttendance.totalHours;
            dayTimeDisplay = dayAttendance.timeDisplay;
            dayEarnings = dayHours * hourlyRate;
        }
        
        // التحقق من يوم الجمعة (آخر يوم في الأسبوع العربي - index = 6)
        const isFriday = index === 6; // آخر يوم في الأسبوع العربي
        
        if (dayAttendance && dayAttendance.checkIn && dayAttendance.checkOut) {
            workDays++;
        }
        
        totalHours += dayHours;
        totalEarnings += dayEarnings;
        
        const row = tbody.insertRow();
        
        if (isFriday) {
            // يوم الجمعة - عطلة
            row.innerHTML = `
                <td>${formatDate(date)}</td>
                <td><strong>الجمعة - عطلة</strong></td>
                <td colspan="5" style="text-align: center; color: #666; font-style: italic;">يوم عطلة أسبوعية</td>
            `;
            row.style.backgroundColor = '#f0f8ff';
            row.style.color = '#666';
        } else {
            const deleteButton = dayAttendance ? 
                `<button class="action-btn delete" onclick="deleteAttendance('${dayAttendance.id}', '${employeeId}', '${week}')" style="font-size: 12px; padding: 4px 8px;">حذف</button>` : 
                '-';
                
            row.innerHTML = `
                <td>${formatDate(date)}</td>
                <td>${dayName}</td>
                <td>${dayAttendance?.checkInDisplay || dayAttendance?.checkIn || '<span style="color: #dc3545;">لم يحضر</span>'}</td>
                <td>${dayAttendance?.checkOutDisplay || dayAttendance?.checkOut || '<span style="color: #dc3545;">لم ينصرف</span>'}</td>
                <td><strong>${dayTimeDisplay}</strong></td>
                <td><strong>${dayEarnings.toFixed(2)} ${currencySymbol}</strong></td>
                <td>${deleteButton}</td>
            `;
            
            // تلوين الصف حسب الحضور
            if (!dayAttendance || !dayAttendance.checkIn) {
                row.style.backgroundColor = '#ffebee';
            } else if (dayAttendance.checkIn && !dayAttendance.checkOut) {
                row.style.backgroundColor = '#fff3e0';
            } else {
                row.style.backgroundColor = '#e8f5e8';
            }
        }
    });
    
    // حساب العمليات المالية للأسبوع
    const weekFinances = finances.filter(fin => {
        const finDate = new Date(fin.date);
        return fin.employeeId === employeeId && 
               finDate >= startDate && finDate <= endDate;
    });
    
    const weekDeductions = weekFinances
        .filter(fin => fin.type === 'deduction')
        .reduce((sum, fin) => sum + fin.amount, 0);
        
    const weekAdvances = weekFinances
        .filter(fin => fin.type === 'advance')
        .reduce((sum, fin) => sum + fin.amount, 0);
        
    // المدفوعات السابقة لهذا الأسبوع
    const weekPayments = weekFinances
        .filter(fin => fin.type === 'payment' && fin.weekPaid === week)
        .reduce((sum, fin) => sum + fin.amount, 0);
    
    // حساب المبلغ الصافي
    const grossEarnings = totalEarnings - weekDeductions - weekAdvances;
    const netEarnings = grossEarnings - weekPayments;
    
    // حساب إجمالي الوقت بالتنسيق المرئي
    const totalSeconds = Math.floor(totalHours * 3600);
    const totalDisplayHours = Math.floor(totalSeconds / 3600);
    const totalDisplayMinutes = Math.floor((totalSeconds % 3600) / 60);
    const totalDisplaySecs = totalSeconds % 60;
    const totalTimeDisplay = `${totalDisplayHours.toString().padStart(2, '0')}:${totalDisplayMinutes.toString().padStart(2, '0')}:${totalDisplaySecs.toString().padStart(2, '0')}`;
    
    // تعبئة ملخص الأسبوع
    document.getElementById('weekSummary').innerHTML = `
        <div class="summary-item">
            <div class="label">إجمالي أيام الحضور</div>
            <div class="value">${workDays} يوم</div>
        </div>
        <div class="summary-item">
            <div class="label">إجمالي وقت العمل</div>
            <div class="value">${totalTimeDisplay}</div>
        </div>
        <div class="summary-item">
            <div class="label">حساب اليوم الواحد</div>
            <div class="value">${dailyRate.toFixed(2)} ${currencySymbol}</div>
        </div>
        <div class="summary-item">
            <div class="label">معدل الراتب بالساعة</div>
            <div class="value">${hourlyRate.toFixed(2)} ${currencySymbol}</div>
        </div>
        <div class="summary-item">
            <div class="label">إجمالي المستحقات</div>
            <div class="value">${totalEarnings.toFixed(2)} ${currencySymbol}</div>
        </div>
        <div class="summary-item">
            <div class="label">الخصومات</div>
            <div class="value">${weekDeductions.toFixed(2)} ${currencySymbol}</div>
        </div>
        <div class="summary-item">
            <div class="label">السلف</div>
            <div class="value">${weekAdvances.toFixed(2)} ${currencySymbol}</div>
        </div>
        <div class="summary-item">
            <div class="label">المدفوع مسبقاً</div>
            <div class="value" style="color: #28a745;">${weekPayments.toFixed(2)} ${currencySymbol}</div>
        </div>
        <div class="summary-item">
            <div class="label">صافي المبلغ المستحق</div>
            <div class="value" style="font-size: 1.8rem; color: ${netEarnings > 0 ? '#ffd700' : '#dc3545'};">${netEarnings.toFixed(2)} ${currencySymbol}</div>
        </div>
    `;
    
    // التمرير إلى قسم التفاصيل
    document.getElementById('employeeDetailSection').scrollIntoView({ 
        behavior: 'smooth' 
    });
}

// حذف سجل حضور
async function deleteAttendance(attendanceId, employeeId, week) {
    const attendanceRecord = attendance.find(att => att.id === attendanceId);
    if (!attendanceRecord) {
        alert('سجل الحضور غير موجود');
        return;
    }
    
    if (confirm(`هل أنت متأكد من حذف سجل حضور ${attendanceRecord.employeeName} بتاريخ ${formatDate(attendanceRecord.date)}؟`)) {
        // محاولة الحذف من Supabase أولاً
        if (checkIfUsingSupabase() && supabaseManager.isConnected) {
            console.log('🗑️ حذف سجل الحضور من Supabase...');
            const deleted = await supabaseManager.deleteAttendance(attendanceId);
            
            if (!deleted) {
                alert('❌ فشل في حذف سجل الحضور من قاعدة البيانات. يرجى المحاولة مرة أخرى.');
                return;
            }
        }
        
        // الحذف المحلي
        attendance = attendance.filter(att => att.id !== attendanceId);
        saveData();
        
        // إعادة تحميل التفاصيل
        showDetailedEmployeeReport(employeeId, week);
        
        console.log('✅ تم حذف سجل الحضور من البيانات المحلية');
        alert('✅ تم حذف سجل الحضور بنجاح');
    }
}

// إخفاء تفاصيل الموظف
function hideEmployeeDetail() {
    document.getElementById('employeeDetailSection').style.display = 'none';
}

// ===== إدارة الفروع والمواقع =====

// متغير عام لتخزين شبكات WiFi المؤقتة عند إضافة فرع جديد
let tempWifiNetworks = [];

// إضافة شبكة WiFi للنموذج
function addWiFiNetworkToForm() {
    const networkName = document.getElementById('wifiNetworkName').value.trim();
    
    if (!networkName) {
        alert('يرجى إدخال اسم الشبكة');
        return;
    }
    
    if (tempWifiNetworks.includes(networkName)) {
        alert('هذه الشبكة مضافة بالفعل');
        return;
    }
    
    tempWifiNetworks.push(networkName);
    document.getElementById('wifiNetworkName').value = '';
    
    updateWiFiNetworksList();
}

// تحديث قائمة شبكات WiFi في النموذج
function updateWiFiNetworksList() {
    const container = document.getElementById('wifiNetworksList');
    
    if (tempWifiNetworks.length === 0) {
        container.innerHTML = '<small style="color: #666;">📶 شبكات WiFi المضافة ستظهر هنا...</small>';
        return;
    }
    
    container.innerHTML = tempWifiNetworks.map(network => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 10px; background: white; border: 1px solid #dee2e6; border-radius: 3px; margin: 5px 0;">
            <span style="color: #17a2b8;">📶 ${network}</span>
            <button onclick="removeWiFiNetworkFromForm('${network}')" style="background: #dc3545; color: white; border: none; border-radius: 3px; padding: 3px 8px; font-size: 12px;">
                ✕
            </button>
        </div>
    `).join('');
}

// حذف شبكة WiFi من النموذج
function removeWiFiNetworkFromForm(networkName) {
    tempWifiNetworks = tempWifiNetworks.filter(network => network !== networkName);
    updateWiFiNetworksList();
}

// إدارة شبكات WiFi للفروع الموجودة
function loadBranchesForWiFiManagement() {
    const select = document.getElementById('selectBranchForWifi');
    select.innerHTML = '<option value="">-- اختر فرع --</option>';
    
    branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = branch.name;
        select.appendChild(option);
    });
}

// تحميل شبكات WiFi للفرع المحدد
function loadBranchWiFiNetworks() {
    const branchId = document.getElementById('selectBranchForWifi').value;
    const section = document.getElementById('wifiManagementSection');
    
    if (!branchId) {
        section.style.display = 'none';
        return;
    }
    
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    
    document.getElementById('selectedBranchName').textContent = `📶 إدارة شبكات WiFi لفرع: ${branch.name}`;
    section.style.display = 'block';
    
    updateBranchWiFiNetworksList(branch);
}

// تحديث قائمة شبكات WiFi للفرع
function updateBranchWiFiNetworksList(branch) {
    const container = document.getElementById('branchWifiNetworksList');
    const networks = branch.wifiNetworks || [];
    
    if (networks.length === 0) {
        container.innerHTML = `
            <div style="padding: 15px; text-align: center; color: #666; background: #f8f9fa; border-radius: 5px;">
                📶 لم يتم إضافة شبكات WiFi لهذا الفرع بعد
            </div>
        `;
        return;
    }
    
    container.innerHTML = networks.map(network => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border: 1px solid #dee2e6; border-radius: 5px; margin: 8px 0;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="color: #17a2b8; font-size: 16px;">📶</span>
                <span style="font-weight: bold; color: #495057;">${network}</span>
            </div>
            <button onclick="removeWiFiNetworkFromBranch('${branch.id}', '${network}')" 
                    style="background: #dc3545; color: white; border: none; border-radius: 3px; padding: 5px 10px; font-size: 12px;">
                🗑️ حذف
            </button>
        </div>
    `).join('');
}

// إضافة شبكة WiFi لفرع موجود
async function addWiFiNetworkToBranch() {
    const branchId = document.getElementById('selectBranchForWifi').value;
    const networkName = document.getElementById('newWifiNetworkName').value.trim();
    
    if (!branchId) {
        alert('يرجى اختيار فرع أولاً');
        return;
    }
    
    if (!networkName) {
        alert('يرجى إدخال اسم الشبكة');
        return;
    }
    
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;
    
    // تهيئة مصفوفة الشبكات إذا لم تكن موجودة
    if (!branch.wifiNetworks) {
        branch.wifiNetworks = [];
    }
    
    // التحقق من عدم التكرار
    if (branch.wifiNetworks.includes(networkName)) {
        alert('هذه الشبكة مضافة بالفعل لهذا الفرع');
        return;
    }
    
    // إضافة الشبكة
    branch.wifiNetworks.push(networkName);
    
    // حفظ في قاعدة البيانات
    await saveToActiveDatabase('branch', branch);
    saveData();
    
    // تحديث الواجهة
    document.getElementById('newWifiNetworkName').value = '';
    updateBranchWiFiNetworksList(branch);
    loadBranchesList(); // لتحديث جدول الفروع
    
    showTemporaryMessage(`✅ تم إضافة شبكة "${networkName}" لفرع ${branch.name}`, 'success');
}

// حذف شبكة WiFi من فرع
async function removeWiFiNetworkFromBranch(branchId, networkName) {
    if (!confirm(`هل أنت متأكد من حذف شبكة "${networkName}"؟`)) {
        return;
    }
    
    const branch = branches.find(b => b.id === branchId);
    if (!branch || !branch.wifiNetworks) return;
    
    // حذف الشبكة
    branch.wifiNetworks = branch.wifiNetworks.filter(network => network !== networkName);
    
    // حفظ في قاعدة البيانات
    await saveToActiveDatabase('branch', branch);
    saveData();
    
    // تحديث الواجهة
    updateBranchWiFiNetworksList(branch);
    loadBranchesList(); // لتحديث جدول الفروع
    
    showTemporaryMessage(`✅ تم حذف شبكة "${networkName}" من فرع ${branch.name}`, 'success');
}

// إضافة فرع جديد
async function addBranch(e) {
    e.preventDefault();
    
    const latitude = parseFloat(document.getElementById('branchLatitude').value);
    const longitude = parseFloat(document.getElementById('branchLongitude').value);
    
    if (!latitude || !longitude) {
        alert('يرجى تحديد الموقع الجغرافي للفرع');
        return;
    }
    
    const branch = {
        id: generateTempId(), // سيتم استبداله بـ UUID من Supabase
        name: document.getElementById('branchName').value,
        address: document.getElementById('branchAddress').value,
        latitude: latitude,
        longitude: longitude,
        radius: parseInt(document.getElementById('branchRadius').value),
        wifiNetworks: [...tempWifiNetworks], // نسخ شبكات WiFi المضافة
        createdAt: new Date().toISOString()
    };
    
    // حفظ في قاعدة البيانات النشطة أولاً
    const savedBranch = await saveToActiveDatabase('branch', branch);
    
    if (savedBranch && savedBranch.id) {
        // استخدام UUID الذي أرجعه Supabase
        branch.id = savedBranch.id;
    }
    
    branches.push(branch);
    saveData();
    
    loadBranchesList();
    loadBranchesSelect();
    loadBranchesForWiFiManagement(); // تحديث قائمة الفروع لإدارة WiFi
    
    // مسح النموذج
    document.getElementById('addBranchForm').reset();
    document.getElementById('currentLocationDisplay').style.display = 'none';
    document.getElementById('manualLocationInputs').style.display = 'none';
    
    // مسح شبكات WiFi المؤقتة
    tempWifiNetworks = [];
    updateWiFiNetworksList();
    
    alert('تم إضافة الفرع بنجاح');
}

// تحميل قائمة الفروع
function loadBranchesList() {
    const tbody = document.getElementById('branchesTableBody');
    tbody.innerHTML = '';
    
    branches.forEach(branch => {
        const employeeCount = employees.filter(emp => emp.branchId === branch.id).length;
        const wifiNetworks = branch.wifiNetworks || [];
        
        // تنسيق عرض شبكات WiFi
        let wifiDisplay = '';
        if (wifiNetworks.length === 0) {
            wifiDisplay = '<small style="color: #666;">لا توجد شبكات</small>';
        } else if (wifiNetworks.length <= 2) {
            wifiDisplay = wifiNetworks.map(network => `<span style="color: #17a2b8;">📶 ${network}</span>`).join('<br>');
        } else {
            wifiDisplay = `
                <span style="color: #17a2b8;">📶 ${wifiNetworks[0]}</span><br>
                <span style="color: #17a2b8;">📶 ${wifiNetworks[1]}</span><br>
                <small style="color: #666;">+${wifiNetworks.length - 2} أخرى</small>
            `;
        }
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><strong>${branch.name}</strong></td>
            <td>${branch.address}</td>
            <td>${branch.latitude.toFixed(6)}, ${branch.longitude.toFixed(6)}</td>
            <td>${branch.radius} متر</td>
            <td style="font-size: 12px;">${wifiDisplay}</td>
            <td>${employeeCount} موظف</td>
            <td>
                <button class="action-btn" onclick="testBranchLocation('${branch.id}')">اختبار</button>
                <button class="action-btn delete" onclick="deleteBranch('${branch.id}')">حذف</button>
            </td>
        `;
    });
}

// تحميل قائمة الفروع في select
function loadBranchesSelect() {
    const select = document.getElementById('empBranch');
    select.innerHTML = '<option value="">اختر الفرع</option>';
    
    branches.forEach(branch => {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = branch.name;
        select.appendChild(option);
    });
}

// حذف فرع
async function deleteBranch(id) {
    const branch = branches.find(b => b.id === id);
    const employeeCount = employees.filter(emp => emp.branchId === id).length;
    
    if (employeeCount > 0) {
        alert(`لا يمكن حذف الفرع "${branch.name}" لأنه يحتوي على ${employeeCount} موظف/موظفين`);
        return;
    }
    
    if (confirm(`هل أنت متأكد من حذف فرع "${branch.name}"؟`)) {
        // محاولة الحذف من Supabase أولاً إذا كان ID صحيح
        if (checkIfUsingSupabase() && supabaseManager.isConnected && isValidSupabaseId(id)) {
            console.log('🗑️ حذف الفرع من Supabase...');
            const deleted = await supabaseManager.deleteBranch(id);
            
            if (!deleted) {
                alert('❌ فشل في حذف الفرع من قاعدة البيانات. يرجى المحاولة مرة أخرى.');
                return;
            }
        } else if (!isValidSupabaseId(id)) {
            console.log('⚠️ ID مؤقت - لن يتم الحذف من Supabase:', id);
        }
        
        // الحذف المحلي
        branches = branches.filter(b => b.id !== id);
        saveData();
        loadBranchesList();
        loadBranchesSelect();
        
        console.log('✅ تم حذف الفرع من البيانات المحلية');
        alert('✅ تم حذف الفرع بنجاح');
    }
}

// الحصول على الموقع الحالي للفرع
async function getCurrentLocationForBranch() {
    try {
        document.getElementById('currentLocationDisplay').style.display = 'none';
        
        // عرض رسالة انتظار
        const waitingMsg = document.createElement('div');
        waitingMsg.id = 'locationWaiting';
        waitingMsg.innerHTML = '🔍 جاري تحديد موقعك الحالي...<br><small>قد يستغرق هذا بضع ثوان</small>';
        waitingMsg.style.cssText = 'background: #e3f2fd; padding: 10px; border-radius: 5px; margin: 10px 0; text-align: center;';
        document.getElementById('currentLocationDisplay').parentNode.insertBefore(waitingMsg, document.getElementById('currentLocationDisplay'));
        
        const position = await getCurrentPosition();
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        const accuracy = position.coords.accuracy;
        
        // إزالة رسالة الانتظار
        const waitingElement = document.getElementById('locationWaiting');
        if (waitingElement) waitingElement.remove();
        
        // تعبئة الحقول
        document.getElementById('branchLatitude').value = latitude;
        document.getElementById('branchLongitude').value = longitude;
        
        // عرض المعلومات
        document.getElementById('selectedLocationText').innerHTML = `
            خط العرض: ${latitude.toFixed(6)}<br>
            خط الطول: ${longitude.toFixed(6)}
        `;
        document.getElementById('locationAccuracy').textContent = `دقة التحديد: ±${Math.round(accuracy)} متر`;
        document.getElementById('currentLocationDisplay').style.display = 'block';
        
        // إخفاء الإدخال اليدوي
        document.getElementById('manualLocationInputs').style.display = 'none';
        
    } catch (error) {
        // إزالة رسالة الانتظار
        const waitingElement = document.getElementById('locationWaiting');
        if (waitingElement) waitingElement.remove();
        
        alert('فشل في تحديد الموقع:\n\n' + error.message);
    }
}

// اختبار تحديد الموقع
async function testLocationAccess() {
    const resultDiv = document.getElementById('locationTestResult');
    
    try {
        resultDiv.innerHTML = '<p style="color: #2196F3;">🔍 جاري اختبار تحديد الموقع...</p>';
        
        const position = await getCurrentPosition();
        const { latitude, longitude, accuracy } = position.coords;
        
        resultDiv.innerHTML = `
            <div class="test-result success">
                ✅ تم تحديد الموقع بنجاح!<br>
                📍 الإحداثيات: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}<br>
                🎯 دقة التحديد: ±${Math.round(accuracy)} متر<br>
                ⏰ الوقت: ${new Date().toLocaleTimeString('ar-SA')}
            </div>
        `;
        
    } catch (error) {
        console.error('خطأ في اختبار الموقع:', error);
        
        resultDiv.innerHTML = `
            <div class="test-result error">
                ❌ فشل في تحديد الموقع<br>
                <small>${error.message}</small>
            </div>
        `;
    }
}

// إظهار إدخال الإحداثيات يدوياً
function showManualLocationInput() {
    document.getElementById('manualLocationInputs').style.display = 'flex';
    document.getElementById('currentLocationDisplay').style.display = 'none';
}

// اختبار الموقع الحالي مع جميع الفروع
async function testCurrentLocation() {
    const resultDiv = document.getElementById('locationTestResult');
    
    try {
        resultDiv.innerHTML = '<p>🔍 جاري تحديد موقعك...</p>';
        
        const position = await getCurrentPosition();
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        let nearestBranch = null;
        let minDistance = Infinity;
        let withinRange = false;
        
        // فحص جميع الفروع
        branches.forEach(branch => {
            const distance = calculateDistance(userLat, userLng, branch.latitude, branch.longitude);
            
            if (distance < minDistance) {
                minDistance = distance;
                nearestBranch = branch;
            }
            
            if (distance <= branch.radius) {
                withinRange = true;
            }
        });
        
        if (branches.length === 0) {
            resultDiv.innerHTML = '<p class="test-result warning">⚠️ لا توجد فروع مسجلة في النظام</p>';
            return;
        }
        
        if (withinRange) {
            resultDiv.innerHTML = `
                <div class="test-result success">
                    ✅ أنت ضمن نطاق فرع "${nearestBranch.name}"<br>
                    المسافة: ${Math.round(minDistance)} متر<br>
                    النطاق المسموح: ${nearestBranch.radius} متر
                </div>
            `;
        } else {
            resultDiv.innerHTML = `
                <div class="test-result error">
                    ❌ أنت خارج نطاق جميع الفروع<br>
                    أقرب فرع: "${nearestBranch.name}"<br>
                    المسافة: ${Math.round(minDistance)} متر<br>
                    تحتاج للاقتراب ${Math.round(minDistance - nearestBranch.radius)} متر إضافي
                </div>
            `;
        }
        
    } catch (error) {
        resultDiv.innerHTML = `<div class="test-result error">❌ فشل في تحديد الموقع: ${error.message}</div>`;
    }
}

// اختبار موقع فرع محدد
async function testBranchLocation(branchId) {
    const branch = branches.find(b => b.id === branchId);
    
    try {
        const position = await getCurrentPosition();
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        const distance = calculateDistance(userLat, userLng, branch.latitude, branch.longitude);
        
        if (distance <= branch.radius) {
            alert(`✅ أنت ضمن نطاق فرع "${branch.name}"\nالمسافة: ${Math.round(distance)} متر`);
        } else {
            alert(`❌ أنت خارج نطاق فرع "${branch.name}"\nالمسافة: ${Math.round(distance)} متر\nالنطاق المطلوب: ${branch.radius} متر`);
        }
        
    } catch (error) {
        alert('فشل في تحديد الموقع: ' + error.message);
    }
}

// التحقق من موقع الموظف عند تسجيل الحضور/الانصراف
async function validateEmployeeLocation() {
    try {
        // التحقق من وجود فرع محدد للموظف
        if (!currentUser.branchId) {
            return {
                valid: false,
                message: 'لم يتم تحديد فرع عمل لك. يرجى مراجعة المدير.'
            };
        }
        
        // العثور على فرع الموظف
        const employeeBranch = branches.find(b => b.id === currentUser.branchId);
        if (!employeeBranch) {
            return {
                valid: false,
                message: 'فرع العمل المحدد لك غير موجود. يرجى مراجعة المدير.'
            };
        }
        
        // تحديد الموقع الحالي
        const position = await getCurrentPosition();
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        
        // حساب المسافة من فرع العمل
        const distance = calculateDistance(userLat, userLng, employeeBranch.latitude, employeeBranch.longitude);
        
        if (distance <= employeeBranch.radius) {
            return {
                valid: true,
                branchName: employeeBranch.name,
                distance: Math.round(distance),
                message: `موقعك محقق في ${employeeBranch.name}`
            };
        } else {
            return {
                valid: false,
                message: `يجب أن تكون قريباً من موقع العمل في "${employeeBranch.name}"\nالمسافة الحالية: ${Math.round(distance)} متر\nالمسافة المطلوبة: ${employeeBranch.radius} متر أو أقل`,
                branchName: employeeBranch.name,
                distance: Math.round(distance)
            };
        }
        
    } catch (error) {
        return {
            valid: false,
            message: 'فشل في تحديد الموقع: ' + error.message
        };
    }
}

// تحديث حالة الموقع في واجهة الموظف
function updateLocationStatus(message, type = 'info') {
    const statusElement = document.getElementById('locationStatus');
    if (statusElement) {
        statusElement.textContent = message;
        statusElement.className = `location-status ${type}`;
    }
}

// فحص موقع الموظف عند دخول النظام
async function checkEmployeeLocationOnLoad() {
    if (currentUser && currentUser.role === 'employee') {
        try {
            const locationCheck = await validateEmployeeLocation();
            if (locationCheck.valid) {
                updateLocationStatus(`📍 أنت في ${locationCheck.branchName} (${locationCheck.distance}م)`, 'success');
            } else {
                updateLocationStatus('⚠️ ' + locationCheck.message, 'error');
            }
        } catch (error) {
            updateLocationStatus('⚠️ تعذر تحديد الموقع', 'error');
        }
    }
}

// طباعة تقرير الموظف
// ====== نظام الحضور المبسط (الموقع الجغرافي فقط) ======

// تم تبسيط النظام ليستخدم الموقع الجغرافي فقط

// تم حذف نظام التوصية الذكي - النظام يستخدم الموقع الجغرافي فقط

// تهيئة مُسح QR Code
function initQRScanner() {
    if (typeof Html5QrcodeScanner === 'undefined') {
        // تحميل مكتبة QR Code إذا لم تكن موجودة
        loadQRLibrary().then(() => {
            startQRScanner();
        }).catch(error => {
            console.error('خطأ في تحميل مكتبة QR:', error);
            document.getElementById('qrReader').innerHTML = `
                <div style="color: #dc3545; padding: 20px; text-align: center;">
                    <h5>خطأ في تحميل مُسح QR Code</h5>
                    <p>يمكنك استخدام الإدخال اليدوي أو طريقة أخرى للحضور</p>
                </div>
            `;
        });
    } else {
        startQRScanner();
    }
}

// تحميل مكتبة QR Code
function loadQRLibrary() {
    return new Promise((resolve, reject) => {
        if (typeof Html5QrcodeScanner !== 'undefined') {
            resolve();
            return;
        }
        
        const script = document.createElement('script');
        script.src = 'https://unpkg.com/html5-qrcode@2.3.8/html5-qrcode.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// بدء مُسح QR Code مع تحسينات للحالات الخاصة
function startQRScanner() {
    const qrReaderElement = document.getElementById('qrReader');
    const now = new Date();
    const hour = now.getHours();
    const isSpecialTime = hour < 6 || hour >= 23; // أوقات خاصة
    
    if (qrCodeScanner) {
        qrCodeScanner.clear();
    }
    
    // إعدادات محسّنة للحالات الخاصة
    const scannerConfig = {
        fps: isSpecialTime ? 15 : 10, // إطارات أكثر للأوقات الخاصة
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true,
        experimentalFeatures: {
            useBarCodeDetectorIfSupported: true // استخدام detector المتقدم إذا متاح
        }
    };
    
    qrCodeScanner = new Html5QrcodeScanner("qrReader", scannerConfig, false);
    qrCodeScanner.render(onQRCodeSuccess, onQRCodeError);
    
    // رسالة خاصة للأوقات غير العادية
    if (isSpecialTime) {
        const specialMessage = document.createElement('div');
        specialMessage.style.cssText = `
            background: #d1ecf1; 
            padding: 10px; 
            border-radius: 5px; 
            margin: 10px 0; 
            border-left: 4px solid #17a2b8;
            text-align: center;
        `;
        specialMessage.innerHTML = `
            <strong>🌃 وضع الحالات الخاصة</strong><br>
            <small>QR Code مُحسّن للعمل في الأوقات غير العادية</small>
        `;
        qrReaderElement.appendChild(specialMessage);
    }
}

// عند نجاح قراءة QR Code
function onQRCodeSuccess(decodedText, decodedResult) {
    console.log('📱 تم قراءة QR Code:', decodedText);
    
    // إيقاف المُسح
    qrCodeScanner.clear();
    
    // التحقق من صحة الكود
    validateQRCode(decodedText);
}

// عند فشل قراءة QR Code
function onQRCodeError(error) {
    // تجاهل الأخطاء العادية (محاولة قراءة مستمرة)
    if (!error.toString().includes('NotFoundException')) {
        console.warn('خطأ في QR Scanner:', error);
    }
}

// ====== دوال الأمان للـ QR Code ======

// إنشاء hash أمني للفرع والوقت
function generateSecurityHash(branchId, timestamp) {
    const dataToHash = `${branchId}_${timestamp.getTime()}_${Math.random()}`;
    let hash = 0;
    for (let i = 0; i < dataToHash.length; i++) {
        const char = dataToHash.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // تحويل إلى 32-bit integer
    }
    return Math.abs(hash).toString(36);
}

// إنشاء معرف جلسة فريد
function generateSessionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// حفظ معلومات الأمان
function saveQRSecurityInfo(qrData) {
    qrSecurityData[qrData.sessionId] = {
        branchId: qrData.branchId,
        generated: qrData.generated,
        validUntil: qrData.validUntil,
        securityHash: qrData.securityHash,
        isActive: true
    };
    localStorage.setItem('qrSecurityData', JSON.stringify(qrSecurityData));
}

// التحقق من صحة وقت QR Code
function isQRTimeValid(qrData) {
    const now = new Date();
    const validUntil = new Date(qrData.validUntil);
    return now <= validUntil;
}

// التحقق من أن QR Code لم يُستخدم من قبل
function isQRSessionUnique(sessionId) {
    return !usedQRSessions.includes(sessionId);
}

// تسجيل استخدام QR Code
function markQRAsUsed(sessionId, employeeId) {
    usedQRSessions.push({
        sessionId: sessionId,
        employeeId: employeeId,
        usedAt: new Date().toISOString()
    });
    localStorage.setItem('usedQRSessions', JSON.stringify(usedQRSessions));
}

// تنظيف QR Codes المنتهية الصلاحية
function cleanExpiredQRs() {
    const now = new Date();
    Object.keys(qrSecurityData).forEach(sessionId => {
        const qrInfo = qrSecurityData[sessionId];
        if (new Date(qrInfo.validUntil) < now) {
            delete qrSecurityData[sessionId];
        }
    });
    localStorage.setItem('qrSecurityData', JSON.stringify(qrSecurityData));
}

// التحقق من صحة QR Code مع الأمان المتقدم
function validateQRCode(qrCode) {
    try {
        // تنظيف QR Codes المنتهية الصلاحية أولاً
        cleanExpiredQRs();
        
        // محاولة فك تشفير QR Code
        const qrData = JSON.parse(qrCode);
        
        // فحص QR Code اليومي المبسط
        if (qrData.type === 'daily_attendance' && qrData.branchId) {
            
            // 1. فحص صلاحية التاريخ والوقت
            const now = new Date();
            const validFrom = new Date(qrData.validFrom);
            const validUntil = new Date(qrData.validUntil);
            
            if (now < validFrom || now > validUntil) {
                throw new Error(`QR Code منتهي الصلاحية.\nصالح من: ${formatDateTime(validFrom)}\nإلى: ${formatDateTime(validUntil)}\n\nسيتم إنشاء كود جديد تلقائياً كل يوم في الساعة 6 صباحاً.`);
            }
            
            // 2. فحص الفرع
            const branch = branches.find(b => b.id === qrData.branchId);
            if (!branch) {
                throw new Error('QR Code غير صحيح - الفرع غير موجود');
            }
            
            // 3. التحقق من صلاحية الموظف للفرع (اختياري)
            if (currentUser.branchId && currentUser.branchId !== qrData.branchId) {
                throw new Error(`هذا QR Code خاص بفرع ${branch.name} وأنت مخصص لفرع آخر`);
            }
            
            // ✅ جميع الفحوصات نجحت - نظام مبسط
            validatedLocation = {
                valid: true,
                method: 'daily_qr',
                branchName: branch.name,
                branchId: branch.id,
                qrCode: qrCode,
                date: qrData.date,
                dailyCode: qrData.dailyCode,
                securityLevel: 'medium'
            };
            
            document.getElementById('qrReader').innerHTML = `
                <div style="color: #28a745; padding: 20px; text-align: center; background: #d4edda; border-radius: 5px; border: 2px solid #28a745;">
                    <h5>📅 تم التحقق من QR Code اليومي</h5>
                    <p><strong>الموقع:</strong> ${branch.name}</p>
                    <p><strong>التاريخ:</strong> ${formatDate(new Date(qrData.date))}</p>
                    <p><strong>صالح حتى:</strong> ${formatDateTime(validUntil)}</p>
                    <p style="color: #155724; font-weight: bold;">✅ يمكنك الآن تسجيل الحضور أو الانصراف</p>
                    <p style="font-size: 12px; color: #666;">💡 كود جديد يُنشأ تلقائياً كل يوم</p>
                </div>
            `;
            
            showTemporaryMessage(`📅 تم التحقق من ${branch.name} - كود اليوم`, 'success');
            
        } else if (qrData.type === 'attendance' && qrData.branchId) {
            // QR Code قديم غير آمن
            throw new Error('QR Code قديم وغير آمن.\nيرجى طلب QR Code جديد من الإدارة.');
            
        } else {
            throw new Error('QR Code غير صحيح - تنسيق خاطئ');
        }
        
    } catch (error) {
        console.error('❌ خطأ في التحقق من QR Code:', error);
        
        document.getElementById('qrReader').innerHTML = `
            <div style="color: #dc3545; padding: 20px; text-align: center; background: #f8d7da; border-radius: 5px; border: 2px solid #dc3545;">
                <h5>🚫 QR Code غير صالح</h5>
                <p style="white-space: pre-line;">${error.message}</p>
                <button onclick="initQRScanner()" style="margin-top: 15px; padding: 10px 15px; background: #007bff; color: white; border: none; border-radius: 5px;">
                    🔄 مسح كود جديد
                </button>
                <button onclick="setAttendanceMethod('location')" style="margin-top: 15px; padding: 10px 15px; background: #28a745; color: white; border: none; border-radius: 5px; margin-right: 10px;">
                    📍 استخدام الموقع الجغرافي
                </button>
            </div>
        `;
        
        validatedLocation = null;
        showTemporaryMessage(`🚫 ${error.message.split('\n')[0]}`, 'error');
    }
}

// تسجيل استخدام QR Code عند الحضور/الانصراف
function recordQRUsage(sessionId, action) {
    if (validatedLocation && validatedLocation.sessionId === sessionId) {
        markQRAsUsed(sessionId, currentUser.id);
        console.log(`🔒 تم تسجيل استخدام QR Code: ${action} للموظف ${currentUser.name}`);
    }
}

// عرض لوحة أمان QR Codes
function showQRSecurityPanel() {
    // تنظيف QR Codes المنتهية أولاً
    cleanExpiredQRs();
    
    const activeQRs = Object.keys(qrSecurityData).length;
    const usedQRs = usedQRSessions.length;
    
    // إحصائيات الاستخدام
    const today = new Date().toISOString().split('T')[0];
    const todayUsage = usedQRSessions.filter(session => 
        session.usedAt && session.usedAt.startsWith(today)
    ).length;
    
    // إنشاء modal للوحة الأمان
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        overflow-y: auto;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 700px; width: 90%; max-height: 80vh; overflow-y: auto; position: relative;">
            <button onclick="this.closest('.security-modal').remove()" 
                    style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 18px;">
                ✕
            </button>
            
            <h3 style="color: #007bff; margin-bottom: 20px;">🛡️ لوحة أمان QR Codes</h3>
            
            <!-- إحصائيات سريعة -->
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin: 20px 0;">
                <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #1976d2;">${activeQRs}</h4>
                    <p style="margin: 5px 0; font-size: 14px;">QR نشط</p>
                </div>
                <div style="background: #f3e5f5; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #7b1fa2;">${usedQRs}</h4>
                    <p style="margin: 5px 0; font-size: 14px;">إجمالي الاستخدام</p>
                </div>
                <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; text-align: center;">
                    <h4 style="margin: 0; color: #388e3c;">${todayUsage}</h4>
                    <p style="margin: 5px 0; font-size: 14px;">استخدام اليوم</p>
                </div>
            </div>
            
            <!-- QR Codes النشطة -->
            <div style="margin: 20px 0;">
                <h4>🔒 QR Codes النشطة:</h4>
                <div id="activeQRsList" style="max-height: 200px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 10px;">
                    ${Object.keys(qrSecurityData).map(sessionId => {
                        const qr = qrSecurityData[sessionId];
                        const branch = branches.find(b => b.id === qr.branchId);
                        const timeLeft = new Date(qr.validUntil) - new Date();
                        const hoursLeft = Math.max(0, Math.floor(timeLeft / (1000 * 60 * 60)));
                        const minutesLeft = Math.max(0, Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60)));
                        
                        return `
                            <div style="background: ${timeLeft > 0 ? '#d4edda' : '#f8d7da'}; padding: 10px; margin: 5px 0; border-radius: 5px; border-left: 4px solid ${timeLeft > 0 ? '#28a745' : '#dc3545'};">
                                <strong>${branch ? branch.name : 'فرع محذوف'}</strong><br>
                                <small>
                                    إنشاء: ${formatDateTime(new Date(qr.generated))}<br>
                                    ${timeLeft > 0 ? 
                                        `باقي: ${hoursLeft} ساعة ${minutesLeft} دقيقة` : 
                                        '<span style="color: #dc3545;">منتهي الصلاحية</span>'
                                    }<br>
                                    Session: ${sessionId.substring(0, 10)}...
                                </small>
                            </div>
                        `;
                    }).join('') || '<p style="text-align: center; color: #666;">لا توجد QR Codes نشطة</p>'}
                </div>
            </div>
            
            <!-- سجل الاستخدام -->
            <div style="margin: 20px 0;">
                <h4>📊 سجل الاستخدام الأخير:</h4>
                <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ddd; border-radius: 5px; padding: 10px;">
                    ${usedQRSessions.slice(-10).reverse().map(usage => {
                        const employee = employees.find(emp => emp.id === usage.employeeId);
                        return `
                            <div style="padding: 8px; margin: 3px 0; background: #f8f9fa; border-radius: 3px;">
                                <strong>${employee ? employee.name : 'موظف محذوف'}</strong><br>
                                <small style="color: #666;">
                                    ${formatDateTime(new Date(usage.usedAt))}<br>
                                    Session: ${usage.sessionId.substring(0, 10)}...
                                </small>
                            </div>
                        `;
                    }).join('') || '<p style="text-align: center; color: #666;">لا يوجد سجل استخدام</p>'}
                </div>
            </div>
            
            <!-- أزرار الإدارة -->
            <div style="text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                <button onclick="cleanExpiredQRs(); this.closest('.security-modal').remove(); showTemporaryMessage('✅ تم تنظيف QR Codes المنتهية', 'success')" 
                        style="padding: 10px 15px; background: #ffc107; color: black; border: none; border-radius: 5px; margin: 5px;">
                    🧹 تنظيف المنتهية
                </button>
                <button onclick="localStorage.removeItem('usedQRSessions'); usedQRSessions = []; this.closest('.security-modal').remove(); showTemporaryMessage('✅ تم مسح سجل الاستخدام', 'success')" 
                        style="padding: 10px 15px; background: #dc3545; color: white; border: none; border-radius: 5px; margin: 5px;">
                    🗑️ مسح السجل
                </button>
                <button onclick="generateAllBranchQRs(); this.closest('.security-modal').remove()" 
                        style="padding: 10px 15px; background: #28a745; color: white; border: none; border-radius: 5px; margin: 5px;">
                    🔒 إنشاء أكواد جديدة
                </button>
            </div>
        </div>
    `;
    
    modal.className = 'security-modal';
    document.body.appendChild(modal);
}

// اكتشاف شبكات WiFi
// الحصول على اسم شبكة WiFi الحالية
async function getCurrentWiFiNetwork() {
    try {
        // محاولة فحص شبكة WiFi باستخدام Navigator API
        if ('connection' in navigator) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            if (connection) {
                console.log('نوع الاتصال:', connection.effectiveType);
            }
        }
        
        // محاولة الحصول على اسم الشبكة من خلال WebRTC
        const pc = new RTCPeerConnection({iceServers: []});
        pc.createDataChannel('');
        
        return new Promise((resolve) => {
            let resolved = false;
            
            pc.onicecandidate = (event) => {
                if (event.candidate && !resolved) {
                    const candidate = event.candidate.candidate;
                    const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
                    if (ipMatch) {
                        const localIP = ipMatch[1];
                        console.log('IP المحلي:', localIP);
                        
                        let networkInfo = {
                            localIP: localIP,
                            isWiFi: !localIP.startsWith('127.'),
                            networkRange: null
                        };
                        
                        // تحديد نطاق الشبكة
                        if (localIP.startsWith('192.168.')) {
                            networkInfo.networkRange = '192.168.x.x';
                        } else if (localIP.startsWith('10.')) {
                            networkInfo.networkRange = '10.x.x.x';
                        } else if (localIP.startsWith('172.')) {
                            networkInfo.networkRange = '172.x.x.x';
                        }
                        
                        resolved = true;
                        resolve(networkInfo);
                    }
                }
            };
            
            pc.createOffer().then(offer => pc.setLocalDescription(offer));
            
            // timeout بعد 5 ثوان
            setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    resolve(null);
                }
            }, 5000);
        });
        
    } catch (error) {
        console.error('خطأ في الحصول على معلومات الشبكة:', error);
        return null;
    }
}

// فحص إذا كان الجهاز متصل بشبكة معينة
async function checkIfConnectedToNetwork(networkName) {
    try {
        // إنشاء طلب XMLHttpRequest لفحص الاتصال بالشبكة
        return new Promise((resolve) => {
            const img = new Image();
            const timeout = setTimeout(() => {
                resolve(false);
            }, 3000);
            
            img.onload = () => {
                clearTimeout(timeout);
                resolve(true);
            };
            
            img.onerror = () => {
                clearTimeout(timeout);
                resolve(false);
            };
            
            // محاولة الوصول لـ router gateway أو أي IP محلي
            img.src = `http://192.168.1.1/favicon.ico?${Date.now()}`;
        });
    } catch (error) {
        return false;
    }
}

async function detectWiFiNetworks() {
    const wifiStatus = document.getElementById('wifiStatus');
    const detectedNetworks = document.getElementById('detectedNetworks');
    
    wifiStatus.style.background = '#fff3cd';
    wifiStatus.style.color = '#856404';
    wifiStatus.textContent = '🔍 جاري فحص شبكة WiFi الحالية...';
    
    try {
        // فحص الشبكة الحالية أولاً
        const currentNetwork = await getCurrentWiFiNetwork();
        
        if (currentNetwork && currentNetwork.isWiFi) {
            wifiStatus.style.background = '#d1ecf1';
            wifiStatus.style.color = '#0c5460';
            wifiStatus.innerHTML = `
                📶 تم اكتشاف اتصال WiFi<br>
                <small>IP المحلي: ${currentNetwork.localIP}</small><br>
                <small>نطاق الشبكة: ${currentNetwork.networkRange || 'غير محدد'}</small>
            `;
            
            console.log('📶 معلومات الشبكة الحالية:', currentNetwork);
        } else {
            wifiStatus.style.background = '#f8d7da';
            wifiStatus.style.color = '#721c24';
            wifiStatus.innerHTML = '⚠️ لم يتم اكتشاف اتصال WiFi<br><small>قد تكون متصلاً عبر البيانات الخلوية</small>';
        }
        
        // فحص الشبكات المعروفة مع تمرير معلومات الشبكة الحالية
        setTimeout(() => {
            checkKnownWiFiNetworks(currentNetwork);
        }, 1000);
        
    } catch (error) {
        console.error('خطأ في فحص الشبكة:', error);
        wifiStatus.style.background = '#f8d7da';
        wifiStatus.style.color = '#721c24';
        wifiStatus.innerHTML = '❌ فشل في فحص شبكة WiFi<br><small>استخدم الإدخال اليدوي أدناه</small>';
        
        // محاولة بديلة - استخدام Navigator Connection API
        if ('connection' in navigator) {
            const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
            
            if (connection) {
                wifiStatus.style.background = '#fff3cd';
                wifiStatus.style.color = '#856404';
                wifiStatus.innerHTML = `
                    📶 معلومات الاتصال (محدودة):<br>
                    النوع: ${connection.effectiveType || 'غير محدد'}<br>
                    السرعة: ${connection.downlink ? connection.downlink + ' Mbps' : 'غير محدد'}
                `;
            }
        }
        
        // المتابعة مع فحص الشبكات المعروفة
        setTimeout(() => {
            checkKnownWiFiNetworks(null);
        }, 1000);
    }
}

// فحص شبكات WiFi المعروفة مع التحقق من الشبكة الحالية
function checkKnownWiFiNetworks(currentNetworkInfo = null) {
    const detectedNetworks = document.getElementById('detectedNetworks');
    const now = new Date();
    const hour = now.getHours();
    const isWorkingHours = hour >= 6 && hour < 23;
    
    // قائمة شبكات WiFi المُحددة من المدير لكل فرع
    const knownNetworks = branches.map(branch => {
        const managedNetworks = branch.wifiNetworks || [];
        const defaultNetworks = [
            `${branch.name}_WiFi`, 
            `${branch.name.replace(/\s+/g, '_')}_Network`,
            `Company_${branch.id}`,
            'Office_WiFi',
            'Workplace_Network'
        ];
        
        // دمج الشبكات المُحددة من المدير مع الشبكات الافتراضية
        const allNetworks = [...managedNetworks, ...defaultNetworks];
        
        return {
            branchId: branch.id,
            branchName: branch.name,
            wifiNames: allNetworks,
            managedNetworks: managedNetworks, // الشبكات المُحددة من المدير فقط
            hasCustomNetworks: managedNetworks.length > 0
        };
    });
    
    detectedNetworks.innerHTML = `
        <div style="background: ${isWorkingHours ? '#e8f4fd' : '#e9ecef'}; padding: 15px; border-radius: 5px; margin: 10px 0; border-left: 4px solid ${isWorkingHours ? '#17a2b8' : '#6c757d'};">
            <h6>${isWorkingHours ? '📶 WiFi Detection - متاح طوال ساعات العمل' : '📶 نظام WiFi Detection المحسّن'}:</h6>
            ${isWorkingHours ? `
                <div style="background: #d1ecf1; padding: 10px; border-radius: 5px; margin: 10px 0;">
                    <strong>📶 وضع ساعات العمل نشط!</strong><br>
                    <small>نظام WiFi متاح من 6 صباحاً إلى 11 مساءً - أكثر دقة من GPS</small>
                </div>
            ` : ''}
            <p style="font-size: 14px; margin: 5px 0;">
                <strong>💡 فكرة ذكية:</strong> بدلاً من الاعتماد على GPS، استخدم شبكات WiFi المعروفة:
            </p>
            ${knownNetworks.map(network => `
                <div style="margin: 5px 0; padding: 8px; background: white; border-radius: 3px; border-left: 3px solid ${isWorkingHours ? '#17a2b8' : '#007bff'};">
                    <strong>${network.branchName}:</strong>
                    ${network.hasCustomNetworks ? `
                        <div style="margin: 5px 0; padding: 5px; background: #d1ecf1; border-radius: 3px;">
                            <small style="color: #0c5460; font-weight: bold;">📶 شبكات محددة من المدير:</small><br>
                            <small style="color: #17a2b8;">${network.managedNetworks.join(', ')}</small>
                        </div>
                    ` : ''}
                    <small style="color: #666;">الشبكات الافتراضية: ${network.wifiNames.filter(name => !network.managedNetworks.includes(name)).join(', ')}</small>
                </div>
            `).join('')}
            
            <div style="background: #d1ecf1; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #17a2b8;">
                <h6>🔧 كيفية الإعداد العملي:</h6>
                <ol style="font-size: 14px; margin: 5px 0;">
                    <li><strong>للمدير:</strong> أضف أسماء شبكات WiFi الحقيقية لكل فرع</li>
                    <li><strong>للموظف:</strong> اتصل بشبكة المكتب عادي</li>
                    <li><strong>للنظام:</strong> يكتشف الشبكة تلقائياً ويسمح بالحضور</li>
                    <li><strong>لا يحتاج:</strong> GPS أو موقع جغرافي</li>
                </ol>
            </div>
            
            <div class="wifi-network-input" style="margin: 15px 0; padding: 10px; background: #f8f9fa; border-radius: 5px;">
                <h6>📝 إضافة شبكة WiFi يدوياً:</h6>
                <input type="text" id="manualWiFiInput" placeholder="أدخل اسم شبكة WiFi الحالية بدقة" 
                       style="padding: 10px; border: 1px solid #ddd; border-radius: 4px; width: 65%; margin-left: 10px;"
                       onkeypress="if(event.key==='Enter') checkManualWiFiNetwork()">
                <button onclick="checkManualWiFiNetwork()" style="padding: 10px 15px; background: #17a2b8; color: white; border: none; border-radius: 4px;">
                    🔍 فحص الشبكة
                </button>
                <p style="font-size: 12px; color: #666; margin: 5px 0;">
                    💡 أدخل اسم الشبكة التي تتصل بها حالياً بالضبط (يمكنك رؤيته في إعدادات WiFi في جهازك)
                </p>
                <div id="manualWiFiResult" style="margin-top: 10px;"></div>
            </div>
        </div>
    `;
    
    // محاولة الكشف التلقائي (معزز)
    setTimeout(() => {
        const wifiStatus = document.getElementById('wifiStatus');
        wifiStatus.style.background = '#fff3cd';
        wifiStatus.style.color = '#856404';
        wifiStatus.innerHTML = `
            📶 نظام WiFi Detection جاهز!<br>
            <small>يمكنك إضافة شبكة يدوياً أو استخدام الشبكات المعروفة</small>
        `;
        
    }, 1000);
}

// إضافة شبكة WiFi يدوياً
// فحص الشبكة المدخلة يدوياً
function checkManualWiFiNetwork() {
    const networkName = document.getElementById('manualWiFiInput').value.trim();
    const resultDiv = document.getElementById('manualWiFiResult');
    
    if (!networkName) {
        resultDiv.innerHTML = `
            <div style="background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24; margin-top: 10px;">
                ❌ يرجى إدخال اسم الشبكة أولاً
            </div>
        `;
        return;
    }
    
    console.log('🔍 فحص شبكة WiFi:', networkName);
    console.log('📋 جميع الفروع:', branches);
    
    // تشخيص أولي - إظهار معلومات الفروع والشبكات
    let diagnosticInfo = '🔍 معلومات تشخيصية:\n';
    branches.forEach((branch, index) => {
        const networks = branch.wifiNetworks || [];
        diagnosticInfo += `${index + 1}. ${branch.name}: [${networks.join(', ')}]\n`;
    });
    console.log(diagnosticInfo);
    
    // البحث في شبكات الفروع المحددة مع مقارنة أكثر مرونة
    let foundBranch = null;
    let exactMatch = false;
    
    // البحث الدقيق أولاً
    for (const branch of branches) {
        const branchNetworks = branch.wifiNetworks || [];
        console.log(`🔍 فحص فرع "${branch.name}" - الشبكات:`, branchNetworks);
        
        if (branchNetworks.includes(networkName)) {
            foundBranch = branch;
            exactMatch = true;
            console.log('✅ تطابق دقيق!');
            break;
        }
    }
    
    // إذا لم يجد تطابق دقيق، جرب التطابق الجزئي (حساسية أقل للأحرف)
    if (!foundBranch) {
        console.log('🔍 محاولة البحث بمرونة أكثر...');
        for (const branch of branches) {
            const branchNetworks = branch.wifiNetworks || [];
            for (const network of branchNetworks) {
                if (network.toLowerCase().includes(networkName.toLowerCase()) || 
                    networkName.toLowerCase().includes(network.toLowerCase())) {
                    foundBranch = branch;
                    console.log(`🔍 تطابق جزئي: "${networkName}" ≈ "${network}"`);
                    break;
                }
            }
            if (foundBranch) break;
        }
    }
    
    if (foundBranch) {
        // الشبكة موجودة في فرع معين
        const matchType = exactMatch ? 'تطابق دقيق' : 'تطابق جزئي';
        resultDiv.innerHTML = `
            <div style="background: #d4edda; padding: 15px; border-radius: 5px; color: #155724; margin-top: 10px; border-left: 4px solid #28a745;">
                ✅ <strong>تم التحقق بنجاح! (${matchType})</strong><br>
                📶 الشبكة "${networkName}" موجودة في فرع: <strong>${foundBranch.name}</strong><br>
                📋 الشبكات المُسجلة: ${(foundBranch.wifiNetworks || []).join(', ')}<br>
                <small>يمكنك الآن تسجيل الحضور/الانصراف</small>
            </div>
        `;
        
        // تسجيل التحقق الناجح
        validatedLocation = {
            valid: true,
            branchName: foundBranch.name,
            branchId: foundBranch.id,
            method: 'wifi',
            networkName: networkName,
            matchType: matchType,
            timestamp: new Date()
        };
        
        console.log('✅ تم التحقق من شبكة WiFi:', validatedLocation);
        showTemporaryMessage(`✅ تم التحقق من شبكة "${networkName}" - ${foundBranch.name}`, 'success');
        
    } else {
        // الشبكة غير مُسجلة - عرض معلومات تشخيصية مفيدة
        let availableNetworks = '';
        branches.forEach(branch => {
            const networks = branch.wifiNetworks || [];
            if (networks.length > 0) {
                availableNetworks += `<br>• <strong>${branch.name}:</strong> ${networks.join(', ')}`;
            }
        });
        
        resultDiv.innerHTML = `
            <div style="background: #f8d7da; padding: 15px; border-radius: 5px; color: #721c24; margin-top: 10px; border-left: 4px solid #dc3545;">
                ❌ <strong>شبكة غير مُسجلة</strong><br>
                📶 الشبكة "${networkName}" غير موجودة في قائمة الشبكات المُعتمدة<br>
                
                📋 <strong>الشبكات المُسجلة:</strong>${availableNetworks || '<br>• لا توجد شبكات مُسجلة'}
                
                <br><br><small>💡 نصائح:
                <br>• تأكد من كتابة اسم الشبكة بالضبط
                <br>• راجع المدير لإضافة شبكة جديدة
                <br>• تحقق من إعدادات الشبكة في جهازك</small>
            </div>
        `;
        
        console.log('❌ شبكة WiFi غير مُسجلة:', networkName);
        console.log('📋 الشبكات المتاحة:', branches.map(b => `${b.name}: [${(b.wifiNetworks || []).join(', ')}]`));
        showTemporaryMessage(`❌ شبكة "${networkName}" غير مُسجلة`, 'error');
    }
}

function addManualWiFiNetwork() {
    // هذه دالة قديمة - استخدم checkManualWiFiNetwork بدلاً منها
    const wifiName = document.getElementById('manualWifiName').value.trim();
    if (!wifiName) {
        alert('يرجى إدخال اسم الشبكة');
        return;
    }
    
    // البحث عن الفرع المطابق أو استخدام الفرع الحالي للموظف
    let branchId = currentUser.branchId;
    if (!branchId && branches.length > 0) {
        branchId = branches[0].id; // استخدام أول فرع
    }
    
    const branch = branches.find(b => b.id === branchId);
    if (!branch) {
        alert('لا يمكن تحديد الفرع');
        return;
    }
    
    // تأكيد الشبكة
    validatedLocation = {
        valid: true,
        method: 'manual_wifi',
        branchName: branch.name,
        branchId: branch.id,
        wifiNetwork: wifiName,
        verifiedAt: new Date().toISOString()
    };
    
    const wifiStatus = document.getElementById('wifiStatus');
    wifiStatus.style.background = '#d4edda';
    wifiStatus.style.color = '#155724';
    wifiStatus.innerHTML = `
        ✅ تم تأكيد الشبكة بنجاح!<br>
        <strong>الشبكة:</strong> ${wifiName}<br>
        <strong>الفرع:</strong> ${branch.name}
    `;
    
    document.getElementById('manualWifiName').value = '';
    showTemporaryMessage(`✅ تم تأكيد شبكة ${wifiName} للفرع ${branch.name}`, 'success');
    
    console.log(`📶 تم تأكيد شبكة WiFi: ${wifiName} للفرع: ${branch.name}`);
}

// ====== نظام كلمة السر اليومية ======

// تهيئة نظام كلمة السر اليومية
function initDailyPasswordSystem() {
    const passwordStatus = document.getElementById('passwordStatus');
    const today = new Date().toISOString().split('T')[0];
    
    passwordStatus.style.background = '#e3f2fd';
    passwordStatus.style.color = '#1976d2';
    passwordStatus.innerHTML = `
        📅 نظام كلمة السر اليومية جاهز<br>
        <small>التاريخ: ${formatDate(new Date())}</small>
    `;
    
    // تركيز على حقل الإدخال
    setTimeout(() => {
        const input = document.getElementById('dailyPasswordInput');
        if (input) {
            input.focus();
        }
    }, 500);
    
    console.log('🔑 تم تهيئة نظام كلمة السر اليومية');
}

// إنشاء كلمة سر يومية تلقائية (للإدارة)
function generateDailyPassword() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    
    // كلمات بسيطة وسهلة التذكر
    const words = [
        'عمل', 'نجاح', 'انجاز', 'تميز', 'ابداع', 'فريق', 'هدف', 'طموح', 
        'قوة', 'ثقة', 'امل', 'حماس', 'نشاط', 'تقدم', 'رقي', 'جد'
    ];
    
    const numbers = ['123', '456', '789', '2024', '2025'];
    
    const wordIndex = dayOfYear % words.length;
    const numberIndex = Math.floor(dayOfYear / words.length) % numbers.length;
    
    return `${words[wordIndex]}${numbers[numberIndex]}`;
}

// الحصول على كلمة السر الصحيحة لليوم
function getTodayPassword() {
    // يمكن للمدير تخصيص كلمة السر أو استخدام التلقائية
    const customPassword = localStorage.getItem('customDailyPassword_' + new Date().toISOString().split('T')[0]);
    
    if (customPassword) {
        return customPassword;
    }
    
    // كلمة سر تلقائية بناءً على التاريخ
    return generateDailyPassword();
}

// التحقق من كلمة السر اليومية
function validateDailyPassword() {
    const inputPassword = document.getElementById('dailyPasswordInput').value.trim();
    const correctPassword = getTodayPassword();
    const passwordStatus = document.getElementById('passwordStatus');
    
    if (!inputPassword) {
        passwordStatus.style.background = '#f8d7da';
        passwordStatus.style.color = '#721c24';
        passwordStatus.textContent = '❌ يرجى إدخال كلمة السر';
        return;
    }
    
    // التحقق من كلمة السر
    if (inputPassword.toLowerCase() === correctPassword.toLowerCase()) {
        // ✅ كلمة السر صحيحة
        let branchId = currentUser.branchId;
        if (!branchId && branches.length > 0) {
            branchId = branches[0].id;
        }
        
        const branch = branches.find(b => b.id === branchId);
        const branchName = branch ? branch.name : 'المكتب الرئيسي';
        
        validatedLocation = {
            valid: true,
            method: 'daily_password',
            branchName: branchName,
            branchId: branchId,
            password: inputPassword,
            verifiedAt: new Date().toISOString(),
            date: new Date().toISOString().split('T')[0]
        };
        
        passwordStatus.style.background = '#d4edda';
        passwordStatus.style.color = '#155724';
        passwordStatus.innerHTML = `
            ✅ كلمة السر صحيحة!<br>
            <strong>مرحباً في ${branchName}</strong><br>
            <small>يمكنك الآن تسجيل الحضور أو الانصراف</small>
        `;
        
        // مسح حقل الإدخال
        document.getElementById('dailyPasswordInput').value = '';
        
        showTemporaryMessage(`✅ مرحباً بك في ${branchName}`, 'success');
        
        console.log(`🔑 تم التحقق من كلمة السر بنجاح للموظف: ${currentUser.name}`);
        
    } else {
        // ❌ كلمة السر خاطئة
        passwordStatus.style.background = '#f8d7da';
        passwordStatus.style.color = '#721c24';
        passwordStatus.innerHTML = `
            ❌ كلمة السر غير صحيحة<br>
            <small>تأكد من الكلمة المعلنة في المكتب اليوم</small>
        `;
        
        // مسح حقل الإدخال
        document.getElementById('dailyPasswordInput').value = '';
        
        showTemporaryMessage('❌ كلمة السر غير صحيحة', 'error');
        
        console.log(`❌ محاولة تسجيل بكلمة سر خاطئة: ${inputPassword} (الصحيحة: ${correctPassword})`);
    }
}

// إعداد كلمة السر المخصصة (للإدارة)
function setCustomDailyPassword(password, date = null) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    localStorage.setItem('customDailyPassword_' + targetDate, password);
    
    console.log(`🔑 تم تعيين كلمة سر مخصصة لتاريخ ${targetDate}: ${password}`);
    showTemporaryMessage(`✅ تم تعيين كلمة السر: ${password}`, 'success');
}

// عرض كلمة السر الحالية (للإدارة فقط)
function showTodayPassword() {
    if (currentUser && currentUser.role === 'manager') {
        const password = getTodayPassword();
        const today = formatDate(new Date());
        
        alert(`🔑 كلمة السر اليومية:\n\n"${password}"\n\nالتاريخ: ${today}\n\nشاركها مع الموظفين في المكتب`);
        
        console.log(`🔑 كلمة السر اليومية: ${password}`);
    } else {
        alert('هذه الوظيفة متاحة للإدارة فقط');
    }
}

// عرض لوحة إدارة كلمات السر
function showPasswordManagement() {
    if (currentUser && currentUser.role !== 'manager') {
        alert('هذه الوظيفة متاحة للإدارة فقط');
        return;
    }
    
    const currentPassword = getTodayPassword();
            const today = formatDate(new Date());
    
    // إنشاء modal لإدارة كلمات السر
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; max-width: 500px; width: 90%; position: relative;">
            <button onclick="this.closest('.password-modal').remove()" 
                    style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 18px;">
                ✕
            </button>
            
            <h3 style="color: #007bff; margin-bottom: 20px;">🔑 إدارة كلمات السر اليومية</h3>
            
            <!-- كلمة السر الحالية -->
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #28a745;">
                <h5 style="margin-top: 0; color: #28a745;">كلمة السر اليوم (${today}):</h5>
                <div style="background: white; padding: 10px; border-radius: 5px; text-align: center; font-size: 24px; font-weight: bold; color: #007bff; margin: 10px 0;">
                    "${currentPassword}"
                </div>
                <p style="margin: 10px 0; font-size: 14px; color: #666;">
                    💡 شارك هذه الكلمة مع الموظفين في المكتب
                </p>
            </div>
            
            <!-- تعيين كلمة سر مخصصة -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                <h5 style="margin-top: 0;">🛠️ تعيين كلمة سر مخصصة:</h5>
                <input type="text" id="customPasswordInput" placeholder="كلمة السر الجديدة" 
                       style="padding: 10px; border: 1px solid #ddd; border-radius: 5px; width: 100%; margin: 10px 0;">
                <button onclick="setCustomPasswordFromModal()" 
                        style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; width: 100%;">
                    ✅ تعيين كلمة السر الجديدة
                </button>
                <p style="margin: 10px 0; font-size: 12px; color: #666;">
                    ملاحظة: ستحل محل الكلمة التلقائية لليوم الحالي
                </p>
            </div>
            
            <!-- إرشادات الاستخدام -->
            <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #17a2b8;">
                <h6>📋 إرشادات كلمة السر اليومية:</h6>
                <ul style="font-size: 14px; margin: 5px 0;">
                    <li><strong>للصباح:</strong> أعلن كلمة السر في اجتماع الصباح أو اكتبها على السبورة</li>
                    <li><strong>للأمان:</strong> غيّر الكلمة إذا شككت في تسريبها</li>
                    <li><strong>للبساطة:</strong> استخدم كلمات سهلة التذكر</li>
                    <li><strong>للفعالية:</strong> أعلن الكلمة فقط للموجودين في المكتب</li>
                </ul>
            </div>
            
            <!-- أزرار الإدارة -->
            <div style="text-align: center; margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                <button onclick="copyPasswordToClipboard('${currentPassword}')" 
                        style="padding: 10px 15px; background: #28a745; color: white; border: none; border-radius: 5px; margin: 5px;">
                    📋 نسخ كلمة السر
                </button>
                <button onclick="generateNewRandomPassword()" 
                        style="padding: 10px 15px; background: #ffc107; color: black; border: none; border-radius: 5px; margin: 5px;">
                    🎲 كلمة سر عشوائية
                </button>
            </div>
        </div>
    `;
    
    modal.className = 'password-modal';
    document.body.appendChild(modal);
}

// تعيين كلمة سر مخصصة من النافذة المنبثقة
function setCustomPasswordFromModal() {
    const password = document.getElementById('customPasswordInput').value.trim();
    if (!password) {
        alert('يرجى إدخال كلمة السر');
        return;
    }
    
    setCustomDailyPassword(password);
    
    // إغلاق النافذة وإعادة فتحها لتحديث المعلومات
    document.querySelector('.password-modal').remove();
    setTimeout(() => {
        showPasswordManagement();
    }, 500);
}

// نسخ كلمة السر للحافظة
function copyPasswordToClipboard(password) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(password).then(() => {
            showTemporaryMessage(`✅ تم نسخ كلمة السر: ${password}`, 'success');
        }).catch(err => {
            console.error('خطأ في النسخ:', err);
            fallbackCopyToClipboard(password);
        });
    } else {
        fallbackCopyToClipboard(password);
    }
}

// نسخ احتياطي
function fallbackCopyToClipboard(text) {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
        document.execCommand('copy');
        showTemporaryMessage(`✅ تم نسخ كلمة السر: ${text}`, 'success');
    } catch (err) {
        console.error('خطأ في النسخ الاحتياطي:', err);
        alert(`كلمة السر: ${text}\n\nانسخها يدوياً`);
    }
    document.body.removeChild(textArea);
}

// إنشاء كلمة سر عشوائية
function generateNewRandomPassword() {
    const words = ['نجاح', 'تميز', 'إبداع', 'عمل', 'فريق', 'هدف', 'قوة', 'أمل'];
    const numbers = ['123', '456', '789', '2024', '999'];
    
    const randomWord = words[Math.floor(Math.random() * words.length)];
    const randomNumber = numbers[Math.floor(Math.random() * numbers.length)];
    const newPassword = `${randomWord}${randomNumber}`;
    
    document.getElementById('customPasswordInput').value = newPassword;
    showTemporaryMessage(`🎲 تم إنشاء كلمة سر عشوائية: ${newPassword}`, 'info');
}

// عرض قيود WiFi في المتصفح
function showWiFiLimitation() {
    const wifiStatus = document.getElementById('wifiStatus');
    const detectedNetworks = document.getElementById('detectedNetworks');
    
    wifiStatus.style.background = '#fff3cd';
    wifiStatus.style.color = '#856404';
    wifiStatus.textContent = '⚠️ قيود أمنية في المتصفح';
    
    detectedNetworks.innerHTML = `
        <div style="background: #f8d7da; padding: 15px; border-radius: 5px; margin: 10px 0;">
            <h6>🚫 قيود WiFi في المتصفح:</h6>
            <p style="font-size: 14px;">
                المتصفحات لا تسمح بالوصول لقائمة شبكات WiFi لأسباب أمنية.<br>
                لاستخدام هذه الميزة بشكل كامل:
            </p>
            <ul style="font-size: 14px; margin: 10px 0;">
                <li>تطوير تطبيق محمول (Android/iOS)</li>
                <li>استخدام PWA مع صلاحيات خاصة</li>
                <li>الاعتماد على QR Code أو الموقع الجغرافي</li>
            </ul>
            <button onclick="validatedLocation = {valid: true, method: 'wifi', branchName: 'تجربة WiFi'}; showTemporaryMessage('✅ تم تفعيل وضع التجربة', 'success')" 
                    style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 5px;">
                🧪 تفعيل وضع التجربة
            </button>
        </div>
    `;
}

// إنشاء QR Code تلقائي يومي (عملي أكثر)
function generateDailyBranchQR(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) {
        alert('الفرع غير موجود');
        return;
    }
    
    // إنشاء QR Code يومي تلقائي
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    
    // صالح لليوم كله (من 6 صباحاً إلى 11 مساءً)
    const startOfDay = new Date(`${today}T06:00:00`);
    const endOfDay = new Date(`${today}T23:00:00`);
    
    // إذا كان الوقت قبل 6 صباحاً، استخدم اليوم الحالي
    // إذا كان بعد 11 مساءً، استخدم اليوم التالي
    let validFrom, validUntil;
    if (now.getHours() < 6) {
        validFrom = startOfDay;
        validUntil = endOfDay;
    } else if (now.getHours() >= 23) {
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        validFrom = new Date(`${tomorrowStr}T06:00:00`);
        validUntil = new Date(`${tomorrowStr}T23:00:00`);
    } else {
        validFrom = startOfDay;
        validUntil = endOfDay;
    }
    
    // بيانات QR Code يومي بسيط وعملي
    const dailyCode = `${branch.id}_${validFrom.toISOString().split('T')[0]}`; // مثل: branch1_2024-01-15
    const qrData = {
        type: 'daily_attendance',
        branchId: branch.id,
        branchName: branch.name,
        date: validFrom.toISOString().split('T')[0],
        validFrom: validFrom.toISOString(),
        validUntil: validUntil.toISOString(),
        dailyCode: dailyCode,
        locationCheck: false // لا يتطلب موقع - WiFi كافي
    };
    
    const qrString = JSON.stringify(qrData);
    
            console.log(`📅 تم إنشاء QR Code يومي للفرع ${branch.name} صالح من ${formatDateTime(validFrom)} إلى ${formatDateTime(validUntil)}`);
    
    // إنشاء نافذة جديدة لعرض QR Code
    const qrWindow = window.open('', '_blank', 'width=400,height=500');
    qrWindow.document.write(`
        <!DOCTYPE html>
        <html dir="rtl">
        <head>
            <title>QR Code - ${branch.name}</title>
            <script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
            <style>
                body { 
                    font-family: Arial, sans-serif; 
                    text-align: center; 
                    padding: 20px;
                    direction: rtl;
                }
                .qr-container {
                    margin: 20px 0;
                    padding: 20px;
                    border: 2px solid #007bff;
                    border-radius: 10px;
                    background: #f8f9fa;
                }
                .instructions {
                    background: #e8f5e8;
                    padding: 15px;
                    border-radius: 5px;
                    margin: 20px 0;
                    text-align: right;
                }
                @media print {
                    body { font-size: 14px; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <h2>🏢 QR Code للحضور</h2>
            <h3>${branch.name}</h3>
            
            <div class="qr-container">
                <canvas id="qrcode"></canvas>
            </div>
            
                         <div class="instructions">
                 <h4>🔒 تعليمات الاستخدام الآمن:</h4>
                 <div style="background: #fff3cd; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #ffc107;">
                     <strong>⚠️ هام:</strong> هذا QR Code آمن ومحمي ضد التلاعب!
                 </div>
                 <ol>
                     <li><strong>اطبع الكود</strong> وضعه في مكان واضح عند مدخل الفرع</li>
                     <li><strong>صالح لـ 4 ساعات فقط</strong> من وقت الإنشاء</li>
                     <li><strong>كل كود يُستخدم مرة واحدة فقط</strong> لكل موظف</li>
                     <li><strong>تحقق إضافي من الموقع</strong> لمزيد من الأمان</li>
                     <li><strong>الكود خاص بفرع "${branch.name}" فقط</strong></li>
                     <li><strong>أعد إنشاء كود جديد</strong> كل 4 ساعات أو عند الحاجة</li>
                 </ol>
                 <div style="background: #d4edda; padding: 10px; border-radius: 5px; margin: 10px 0; border-left: 4px solid #28a745;">
                     <strong>✅ مميزات الأمان:</strong><br>
                     • منع تصوير واستخدام الكود من المنزل<br>
                     • انتهاء صلاحية تلقائي<br>
                     • تتبع الاستخدام ومنع التكرار<br>
                     • تحقق مزدوج من الموقع
                 </div>
             </div>
            
            <div class="no-print">
                <button onclick="window.print()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; margin: 5px;">
                    🖨️ طباعة
                </button>
                <button onclick="downloadQR()" style="padding: 10px 20px; background: #28a745; color: white; border: none; border-radius: 5px; margin: 5px;">
                    💾 تحميل الصورة
                </button>
                <button onclick="window.close()" style="padding: 10px 20px; background: #6c757d; color: white; border: none; border-radius: 5px; margin: 5px;">
                    ❌ إغلاق
                </button>
            </div>
            
            <script>
                // إنشاء QR Code
                const canvas = document.getElementById('qrcode');
                const qrData = '${qrString.replace(/'/g, "\\'")}';
                
                QRCode.toCanvas(canvas, qrData, {
                    width: 256,
                    margin: 2,
                    color: {
                        dark: '#000000',
                        light: '#FFFFFF'
                    }
                }, function(error) {
                    if (error) {
                        console.error('خطأ في إنشاء QR Code:', error);
                        document.getElementById('qrcode').innerHTML = '<p style="color: red;">خطأ في إنشاء QR Code</p>';
                    }
                });
                
                // دالة تحميل QR Code كصورة
                function downloadQR() {
                    const canvas = document.getElementById('qrcode');
                    const link = document.createElement('a');
                    link.download = 'QR_${branch.name.replace(/\s+/g, '_')}.png';
                    link.href = canvas.toDataURL();
                    link.click();
                }
            </script>
        </body>
        </html>
    `);
    
    console.log('📱 تم إنشاء QR Code للفرع:', branch.name);
}

// إنشاء QR Codes يومية لجميع الفروع
function generateAllDailyQRs() {
    if (branches.length === 0) {
        alert('لا توجد فروع مسجلة في النظام');
        return;
    }
    
    const confirmed = confirm(`هل تريد إنشاء QR Codes يومية لجميع الفروع؟\nعدد الفروع: ${branches.length}\n\nملاحظة: كل كود صالح ليوم كامل من 6 صباحاً إلى 11 مساءً`);
    if (!confirmed) return;
    
    branches.forEach((branch, index) => {
        setTimeout(() => {
            generateDailyBranchQR(branch.id);
        }, index * 500); // فترة انتظار بين كل نافذة
    });
    
    showTemporaryMessage(`✅ تم إنشاء ${branches.length} QR Code يومي للفروع`, 'success');
}

// إنشاء QR Codes تلقائياً كل يوم في الساعة 6 صباحاً
function setupDailyQRGeneration() {
    // فحص كل دقيقة إذا حان وقت إنشاء QR جديد
    setInterval(() => {
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes();
        
        // في الساعة 6:00 صباحاً بالضبط
        if (hours === 6 && minutes === 0) {
            console.log('⏰ إنشاء QR Codes تلقائياً للفروع...');
            branches.forEach(branch => {
                generateDailyBranchQR(branch.id);
            });
            showTemporaryMessage('⏰ تم إنشاء QR Codes جديدة تلقائياً لجميع الفروع', 'info');
        }
    }, 60000); // فحص كل دقيقة
    
    console.log('⏰ تم تفعيل النظام التلقائي لإنشاء QR Codes يومياً في الساعة 6 صباحاً');
}

// تحديث قائمة QR Codes
function updateBranchQRList() {
    const container = document.getElementById('branchQRList');
    if (!container) return;
    
    if (branches.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: #666; padding: 20px;">
                <p>لا توجد فروع مسجلة</p>
                <p>أضف فروع أولاً لإنشاء QR Codes لها</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 15px;">
            ${branches.map(branch => `
                <div style="border: 1px solid #ddd; border-radius: 8px; padding: 15px; background: white;">
                    <h5 style="margin-top: 0; color: #007bff;">${branch.name}</h5>
                    <p style="font-size: 14px; color: #666; margin: 5px 0;">
                        📍 ${branch.address || 'عنوان غير محدد'}
                    </p>
                    <p style="font-size: 14px; color: #666; margin: 5px 0;">
                        👥 ${employees.filter(emp => emp.branchId === branch.id).length} موظف
                    </p>
                    <div style="margin-top: 10px;">
                        <button onclick="generateBranchQR('${branch.id}')" 
                                style="padding: 8px 12px; background: #007bff; color: white; border: none; border-radius: 4px; margin: 2px; font-size: 12px;">
                            📱 إنشاء QR
                        </button>
                        <button onclick="previewBranchQR('${branch.id}')" 
                                style="padding: 8px 12px; background: #28a745; color: white; border: none; border-radius: 4px; margin: 2px; font-size: 12px;">
                            👁️ معاينة
                        </button>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

// معاينة QR Code بدون فتح نافذة جديدة
function previewBranchQR(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) {
        alert('الفرع غير موجود');
        return;
    }
    
    const qrData = {
        type: 'attendance',
        branchId: branch.id,
        branchName: branch.name,
        generated: new Date().toISOString()
    };
    
    // إنشاء modal لعرض QR Code
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
    `;
    
    modal.innerHTML = `
        <div style="background: white; padding: 30px; border-radius: 10px; text-align: center; max-width: 400px; position: relative;">
            <button onclick="this.closest('.modal').remove()" 
                    style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 30px; height: 30px; cursor: pointer;">
                ✕
            </button>
            <h3>${branch.name}</h3>
            <div id="previewQR" style="margin: 20px 0;"></div>
            <p style="font-size: 14px; color: #666;">
                يمكن للموظفين مسح هذا الكود لتسجيل الحضور
            </p>
            <button onclick="generateBranchQR('${branch.id}'); this.closest('.modal').remove();"
                    style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; margin: 5px;">
                📱 فتح في نافذة جديدة
            </button>
        </div>
    `;
    
    modal.className = 'modal';
    document.body.appendChild(modal);
    
    // تحميل وإنشاء QR Code
    if (typeof QRCode === 'undefined') {
        // تحميل مكتبة QR Code
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js';
        script.onload = () => {
            createPreviewQR(JSON.stringify(qrData));
        };
        document.head.appendChild(script);
    } else {
        createPreviewQR(JSON.stringify(qrData));
    }
    
    function createPreviewQR(qrString) {
        const canvas = document.createElement('canvas');
        document.getElementById('previewQR').appendChild(canvas);
        
        QRCode.toCanvas(canvas, qrString, {
            width: 200,
            margin: 2
        }, function(error) {
            if (error) {
                document.getElementById('previewQR').innerHTML = '<p style="color: red;">خطأ في إنشاء QR Code</p>';
            }
        });
    }
}

function printEmployeeReport() {
    // إخفاء العناصر غير الضرورية للطباعة
    const actionButtons = document.querySelector('.action-buttons');
    const originalDisplay = actionButtons.style.display;
    actionButtons.style.display = 'none';
    
    // إنشاء محتوى الطباعة
    const printContent = document.getElementById('employeeDetailSection').innerHTML;
    const originalContent = document.body.innerHTML;
    
    // تطبيق محتوى الطباعة
    document.body.innerHTML = `
        <div class="print-container">
            <div class="print-header">
                <h1>نظام إدارة الموارد البشرية</h1>
                <h2>التقرير الأسبوعي للموظف</h2>
                                 <p>تاريخ الطباعة: ${formatDate(new Date())}</p>
            </div>
            ${printContent}
        </div>
    `;
    
    // إضافة أنماط الطباعة مع دعم A5 وخلفية بيضاء
    const printStyle = document.createElement('style');
    printStyle.innerHTML = `
        @page {
            size: A5;
            margin: 15mm;
            background-color: white;
        }
        
        @media print {
            * {
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
                box-shadow: none !important;
            }
            
            html, body {
                background-color: white !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
            }
            
            body {
                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                margin: 0;
                padding: 0;
                direction: rtl;
                background: white !important;
                color: #333 !important;
                font-size: 11px;
                line-height: 1.4;
            }
            
            .print-container {
                max-width: 100%;
                background: white !important;
                padding: 10px;
            }
            
            .print-header {
                text-align: center;
                border-bottom: 2px solid #333;
                padding-bottom: 15px;
                margin-bottom: 20px;
                background: white !important;
            }
            
            .print-header h1 {
                color: #333 !important;
                margin: 0 0 5px 0;
                font-size: 16px;
                font-weight: bold;
            }
            
            .print-header h2 {
                color: #666 !important;
                margin: 0 0 5px 0;
                font-size: 14px;
            }
            
            .print-header p {
                color: #999 !important;
                margin: 0;
                font-size: 10px;
            }
            
            .employee-detail-header {
                background: white !important;
                padding: 10px;
                border-radius: 3px;
                margin-bottom: 15px;
                border: 1px solid #ddd;
            }
            
            .employee-detail-header h4 {
                color: #333 !important;
                margin: 0 0 3px 0;
                font-size: 13px;
                font-weight: bold;
            }
            
            .employee-detail-header p {
                color: #666 !important;
                margin: 0;
                font-size: 10px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 9px;
                background: white !important;
            }
            
            table th {
                background: #333 !important;
                color: white !important;
                padding: 6px 4px;
                text-align: right;
                border: 1px solid #333;
                font-weight: bold;
                font-size: 9px;
            }
            
            table td {
                padding: 5px 4px;
                border: 1px solid #ddd;
                text-align: right;
                background: white !important;
                color: #333 !important;
                font-size: 9px;
            }
            
            table tr:nth-child(even) td {
                background-color: #f9f9f9 !important;
            }
            
            .summary-card {
                background: white !important;
                color: #333 !important;
                border: 1px solid #333;
                padding: 10px;
                border-radius: 3px;
                margin-top: 15px;
                page-break-inside: avoid;
            }
            
            .summary-card h4 {
                color: #333 !important;
                text-align: center;
                margin-bottom: 10px;
                font-size: 12px;
                font-weight: bold;
            }
            
            #weekSummary {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                gap: 5px;
            }
            
            .summary-item {
                background: white !important;
                border: 1px solid #ddd;
                padding: 6px;
                border-radius: 2px;
                text-align: center;
            }
            
            .summary-item .label {
                font-size: 8px;
                color: #666 !important;
                margin-bottom: 3px;
            }
            
            .summary-item .value {
                font-size: 10px;
                font-weight: bold;
                color: #333 !important;
            }
        }
    `;
    
    document.head.appendChild(printStyle);
    
    // طباعة الصفحة
    window.print();
    
    // استعادة المحتوى الأصلي بعد الطباعة
    setTimeout(() => {
        document.body.innerHTML = originalContent;
        actionButtons.style.display = originalDisplay;
        
        // إعادة تحميل الأحداث
        if (currentUser && currentUser.role === 'manager') {
            showManagerDashboard();
        } else {
            showEmployeeDashboard();
        }
    }, 1000);
}

// تشخيص النظام
// اختبار اتصال قاعدة البيانات
async function testDatabaseConnection() {
    console.log('🔍 بدء اختبار اتصال قاعدة البيانات...');
    
    const resultDiv = document.getElementById('diagnosticResult') || createDiagnosticDiv();
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<div style="text-align: center;">🔄 جاري اختبار الاتصال...</div>';
    
    try {
        // 1. فحص الإعدادات
        const hasConfig = checkIfUsingSupabase();
        console.log('✅ فحص الإعدادات:', hasConfig);
        
        if (!hasConfig) {
            resultDiv.innerHTML = `
                <div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 5px;">
                    <h5>❌ قاعدة البيانات غير مُعدّة</h5>
                    <p>• Supabase غير مُعدّ أو الإعدادات ناقصة</p>
                    <p>• سيتم استخدام التخزين المحلي فقط</p>
                    <p>• للحصول على مزامنة البيانات، يرجى إعداد Supabase من تبويب الإعدادات</p>
                </div>
            `;
            return;
        }
        
        // 2. فحص وجود supabaseManager
        if (!supabaseManager || !supabaseManager.supabase) {
            resultDiv.innerHTML = `
                <div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 5px;">
                    <h5>❌ خطأ في إعداد قاعدة البيانات</h5>
                    <p>• Supabase Manager غير مُهيأ</p>
                    <p>• يرجى إعادة تحميل الصفحة</p>
                </div>
            `;
            return;
        }
        
        // 3. اختبار الاتصال
        console.log('🔍 اختبار الاتصال مع Supabase...');
        const connectionTest = await supabaseManager.testConnection();
        
        if (!connectionTest) {
            resultDiv.innerHTML = `
                <div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 5px;">
                    <h5>❌ فشل الاتصال مع قاعدة البيانات</h5>
                    <p>• تعذر الاتصال مع Supabase</p>
                    <p>• تحقق من صحة URL و API Key</p>
                    <p>• تحقق من اتصال الإنترنت</p>
                </div>
            `;
            return;
        }
        
        // 4. اختبار حفظ بيانات تجريبية
        console.log('🧪 اختبار حفظ البيانات...');
        const testData = {
            id: 'test_' + Date.now(),
            employeeId: currentUser ? currentUser.id : 'test_employee',
            employeeName: currentUser ? currentUser.name : 'موظف تجريبي',
            date: new Date().toISOString().split('T')[0],
            checkIn: '09:00:00',
            checkOut: null,
            totalHours: 0,
            location: 'اختبار'
        };
        
        const activeDb = getActiveDatabase();
        const saveResult = await saveToActiveDatabase('attendance', testData);
        
        // حذف البيانات التجريبية إذا تم حفظها
        if (saveResult && saveResult.id && supabaseManager) {
            try {
                await supabaseManager.deleteAttendance(saveResult.id);
                console.log('🗑️ تم حذف البيانات التجريبية');
            } catch (error) {
                console.warn('تحذير: لم يتم حذف البيانات التجريبية:', error);
            }
        }
        
        // 5. عرض النتائج
        const dbType = activeDb === 'supabase' ? '🚀 Supabase' : '💽 التخزين المحلي';
        const saveStatus = saveResult ? '✅ نجح' : '❌ فشل';
        
        resultDiv.innerHTML = `
            <div style="color: #155724; padding: 10px; background: #d4edda; border-radius: 5px;">
                <h5>✅ نتائج اختبار قاعدة البيانات</h5>
                <div style="font-family: 'Courier New', monospace; margin: 10px 0;">
                    <p><strong>📊 قاعدة البيانات النشطة:</strong> ${dbType}</p>
                    <p><strong>🔗 حالة الاتصال:</strong> ✅ متصل</p>
                    <p><strong>💾 اختبار الحفظ:</strong> ${saveStatus}</p>
                    <p><strong>🆔 معرف المستخدم:</strong> ${currentUser ? currentUser.id : 'غير محدد'}</p>
                    <p><strong>⏰ وقت الاختبار:</strong> ${formatDateTime(new Date())}</p>
                </div>
                <p style="font-size: 14px; margin-top: 10px;">
                    ${activeDb === 'supabase' ? 
                        '🎉 قاعدة البيانات تعمل بشكل مثالي! جميع البيانات ستُحفظ ويمكن مشاركتها.' : 
                        '⚠️ يتم استخدام التخزين المحلي فقط. البيانات محدودة بهذا الجهاز.'
                    }
                </p>
            </div>
        `;
        
        console.log('✅ اكتمل اختبار قاعدة البيانات بنجاح');
        
    } catch (error) {
        console.error('❌ خطأ في اختبار قاعدة البيانات:', error);
        resultDiv.innerHTML = `
            <div style="color: #dc3545; padding: 10px; background: #f8d7da; border-radius: 5px;">
                <h5>❌ خطأ في اختبار قاعدة البيانات</h5>
                <p><strong>رسالة الخطأ:</strong> ${error.message}</p>
                <p><strong>النوع:</strong> ${error.name}</p>
                <p style="font-size: 12px; margin-top: 10px;">
                    تحقق من Console للمزيد من التفاصيل (اضغط F12)
                </p>
            </div>
        `;
    }
}

function createDiagnosticDiv() {
    let div = document.getElementById('diagnosticResult');
    if (!div) {
        div = document.createElement('div');
        div.id = 'diagnosticResult';
        div.style.marginTop = '10px';
        div.style.padding = '10px';
        div.style.borderRadius = '5px';
        div.style.display = 'none';
        
        // البحث عن مكان مناسب لإضافة العنصر
        const diagnosticSection = document.querySelector('.diagnostic-section');
        if (diagnosticSection) {
            diagnosticSection.appendChild(div);
        }
    }
    return div;
}

// اختبار تشخيصي شامل للنظام
async function testSystemDiagnostic() {
    const resultDiv = document.getElementById('diagnosticResult');
    resultDiv.style.display = 'block';
    resultDiv.innerHTML = '<p style="color: #17a2b8;">🔍 جاري فحص النظام...</p>';
    
    const results = [];
    
    try {
        // 1. فحص إعدادات Supabase
        const usingSupabase = checkIfUsingSupabase();
        results.push(`📋 Supabase مُعدّ: ${usingSupabase ? '✅ نعم' : '❌ لا'}`);
        
        // 2. فحص اتصال Supabase
        if (usingSupabase) {
            try {
                const connected = await supabaseManager.testConnection();
                results.push(`🌐 اتصال Supabase: ${connected ? '✅ متصل' : '❌ غير متصل'}`);
            } catch (error) {
                results.push(`🌐 اتصال Supabase: ❌ خطأ (${error.message})`);
            }
        }
        
        // 3. فحص قاعدة البيانات النشطة
        const activeDb = getActiveDatabase();
        results.push(`🗄️ قاعدة البيانات النشطة: ${activeDb}`);
        
        // 4. فحص البيانات المحلية
        results.push(`👥 عدد الموظفين: ${employees.length}`);
        results.push(`📅 سجلات الحضور: ${attendance.length}`);
        results.push(`💰 السجلات المالية: ${finances.length}`);
        results.push(`🏢 الفروع: ${branches.length}`);
        
        // 5. فحص الموظف الحالي
        if (currentUser) {
            results.push(`👤 الموظف الحالي: ${currentUser.name} (${currentUser.id})`);
            
            // فحص صحة ID
            const isValidId = !currentUser.id.toString().match(/^\d{13,}$/);
            results.push(`🆔 صحة معرف الموظف: ${isValidId ? '✅ صحيح' : '❌ timestamp ID'}`);
            
            // فحص حضور اليوم
            const today = new Date().toISOString().split('T')[0];
            const todayAttendance = attendance.find(att => 
                att.employeeId === currentUser.id && att.date === today
            );
            
            if (todayAttendance) {
                results.push(`📋 حضور اليوم: ✅ موجود`);
                results.push(`⏰ وقت الحضور: ${todayAttendance.checkInDisplay || todayAttendance.checkIn || 'لم يسجل'}`);
                results.push(`⏰ وقت الانصراف: ${todayAttendance.checkOutDisplay || todayAttendance.checkOut || 'لم يسجل'}`);
                results.push(`🕐 إجمالي الوقت: ${todayAttendance.timeDisplay || 'غير محسوب'}`);
                
                if (todayAttendance.checkIn && todayAttendance.checkInDisplay) {
                    results.push(`🔧 تنسيق DB: ${todayAttendance.checkIn} | عرض: ${todayAttendance.checkInDisplay}`);
                }
            } else {
                results.push(`📋 حضور اليوم: ❌ غير موجود`);
            }
        }
        
        // 6. فحص GPS
        if (navigator.geolocation) {
            results.push(`🌍 دعم GPS: ✅ مدعوم`);
        } else {
            results.push(`🌍 دعم GPS: ❌ غير مدعوم`);
        }
        
        // عرض النتائج
        resultDiv.innerHTML = `
            <div style="background: #e8f5e8; color: #155724; padding: 15px; border-radius: 5px;">
                <h6 style="margin-top: 0;">📊 نتائج فحص النظام:</h6>
                ${results.map(result => `<div style="margin: 5px 0;">• ${result}</div>`).join('')}
                <div style="margin-top: 15px; padding-top: 10px; border-top: 1px solid #c3e6cb;">
                    <small>💡 تحقق من Console (F12) للمزيد من التفاصيل</small>
                </div>
            </div>
        `;
        
        // طباعة تفاصيل إضافية في Console
        console.log('🔍 تشخيص النظام الكامل:', {
            supabaseConfig: SUPABASE_CONFIG,
            currentUser,
            employees,
            attendance,
            finances,
            branches,
            localStorage: {
                employees: localStorage.getItem('employees'),
                attendance: localStorage.getItem('attendance'),
                finances: localStorage.getItem('finances'),
                branches: localStorage.getItem('branches'),
                currentUser: localStorage.getItem('currentUser')
            }
        });
        
    } catch (error) {
        console.error('❌ خطأ في تشخيص النظام:', error);
        resultDiv.innerHTML = `
            <div style="background: #f8d7da; color: #721c24; padding: 15px; border-radius: 5px;">
                ❌ فشل في فحص النظام: ${error.message}
            </div>
        `;
    }
}

// ========== دوال مساعدة للتحقق من صحة البيانات ==========

// التحقق من صحة ID قبل إرساله لـ Supabase
function isValidSupabaseId(id) {
    if (!id) return false;
    
    const idStr = id.toString();
    
    // لا نقبل IDs المؤقتة
    if (idStr.startsWith('temp_')) return false;
    
    // لا نقبل timestamp IDs (أرقام فقط أطول من 10 أرقام)
    if (idStr.match(/^\d{10,}$/)) return false;
    
    // نفضل UUIDs (أطول من 20 حرف ويحتوي على شرطات)
    if (idStr.length > 20 && idStr.includes('-')) return true;
    
    // نقبل IDs أخرى صحيحة (أقصر من 20 حرف ولا تحتوي أرقام فقط)
    if (idStr.length <= 20 && !idStr.match(/^\d+$/)) return true;
    
    return false;
}

// تنظيف البيانات قبل الإرسال لـ Supabase
function cleanDataForSupabase(data, type) {
    const cleanedData = { ...data };
    
    // إزالة IDs غير صحيحة أو مؤقتة
    if (cleanedData.id && (!isValidSupabaseId(cleanedData.id) || cleanedData.id.includes('temp_') || cleanedData.id.includes('local_'))) {
        console.log(`🧹 تم حذف ID مؤقت/محلي: ${data.id}`);
        delete cleanedData.id;
    }
    
    // تنظيف branch-specific data
    if (type === 'branch') {
        // تأكد من أن العنوان ليس فارغ
        if (!cleanedData.address) cleanedData.address = '';
        
        // تأكد من أن wifiNetworks مصفوفة
        if (cleanedData.wifiNetworks && !Array.isArray(cleanedData.wifiNetworks)) {
            cleanedData.wifiNetworks = [];
        }
    }
    
    return cleanedData;
}

// ========== دوال مساعدة لحل مشاكل WiFi ==========

// تحديث بيانات شبكات WiFi من قاعدة البيانات
async function refreshBranchWiFiData() {
    showTemporaryMessage('🔄 جاري تحديث بيانات الشبكات...', 'info');
    
    try {
        // إعادة تحميل بيانات الفروع من قاعدة البيانات
        if (supabaseManager && supabaseManager.supabase) {
            console.log('🔄 تحديث من Supabase...');
            const { data: branchesData } = await supabaseManager.supabase
                .from('branches')
                .select('*');
            
            if (branchesData) {
                branches.length = 0;
                branches.push(...branchesData);
                
                // تحديث التخزين المحلي
                localStorage.setItem('branches', JSON.stringify(branches));
                
                console.log('✅ تم تحديث بيانات الفروع:', branches);
                showTemporaryMessage('✅ تم تحديث بيانات الشبكات بنجاح', 'success');
                
                // تحديث واجهة إدارة الفروع إذا كانت مفتوحة
                if (document.getElementById('branchWiFiManagement')) {
                    loadBranchesForWiFiManagement();
                }
                
                return true;
            }
        } else {
            console.log('📂 استخدام البيانات المحلية...');
            const localBranches = localStorage.getItem('branches');
            if (localBranches) {
                branches.length = 0;
                branches.push(...JSON.parse(localBranches));
                showTemporaryMessage('✅ تم تحديث البيانات من التخزين المحلي', 'success');
                return true;
            }
        }
        
        showTemporaryMessage('⚠️ لا توجد بيانات للتحديث', 'warning');
        return false;
        
    } catch (error) {
        console.error('❌ خطأ في تحديث البيانات:', error);
        showTemporaryMessage('❌ فشل تحديث البيانات: ' + error.message, 'error');
        return false;
    }
}

// عرض معلومات تشخيصية لمشاكل WiFi
function showWiFiDiagnostic() {
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        overflow-y: auto;
    `;
    
    // جمع معلومات تشخيصية
    let branchesInfo = '';
    let totalNetworks = 0;
    
    branches.forEach((branch, index) => {
        const networks = branch.wifiNetworks || [];
        totalNetworks += networks.length;
        branchesInfo += `
            <tr style="background: ${index % 2 === 0 ? '#f8f9fa' : 'white'};">
                <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">${branch.name}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${branch.id}</td>
                <td style="padding: 8px; border: 1px solid #ddd;">${networks.length}</td>
                <td style="padding: 8px; border: 1px solid #ddd; font-size: 12px;">
                    ${networks.length > 0 ? networks.join('<br>') : '<em style="color: #999;">لا توجد شبكات</em>'}
                </td>
            </tr>
        `;
    });
    
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    const dbType = getActiveDatabase();
    
    modal.innerHTML = `
        <div style="background: white; padding: 20px; border-radius: 10px; max-width: 800px; width: 95%; max-height: 90vh; overflow-y: auto; position: relative;">
            <button onclick="this.closest('.wifi-diagnostic-modal').remove()" 
                    style="position: absolute; top: 15px; right: 15px; background: #dc3545; color: white; border: none; border-radius: 50%; width: 35px; height: 35px; cursor: pointer; font-size: 18px;">
                ✕
            </button>
            
            <h3 style="color: #007bff; margin-bottom: 20px;">🔍 تشخيص مشاكل WiFi</h3>
            
            <!-- معلومات عامة -->
            <div style="background: #e8f5e8; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h5 style="margin-top: 0; color: #28a745;">📊 معلومات عامة:</h5>
                <div style="font-size: 14px;">
                    <p><strong>👤 المستخدم الحالي:</strong> ${currentUser.name || 'غير محدد'} (${currentUser.id || 'غير محدد'})</p>
                    <p><strong>🗄️ قاعدة البيانات:</strong> ${dbType === 'supabase' ? '🚀 Supabase' : '💽 محلي'}</p>
                    <p><strong>🏢 عدد الفروع:</strong> ${branches.length}</p>
                    <p><strong>📶 إجمالي الشبكات:</strong> ${totalNetworks}</p>
                    <p><strong>⏰ الوقت الحالي:</strong> ${formatDateTime(new Date())}</p>
                </div>
            </div>
            
            <!-- جدول الفروع والشبكات -->
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h5 style="margin-top: 0; color: #007bff;">🏢 تفاصيل الفروع والشبكات:</h5>
                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <thead>
                            <tr style="background: #007bff; color: white;">
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">اسم الفرع</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">معرف الفرع</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">عدد الشبكات</th>
                                <th style="padding: 10px; border: 1px solid #ddd; text-align: right;">أسماء الشبكات</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${branchesInfo || '<tr><td colspan="4" style="text-align: center; padding: 20px; color: #999;">لا توجد فروع</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- اختبار سريع -->
            <div style="background: #e3f2fd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h5 style="margin-top: 0; color: #1976d2;">🧪 اختبار سريع:</h5>
                <div style="margin: 10px 0;">
                    <input type="text" id="quickTestNetwork" placeholder="اكتب اسم الشبكة للاختبار..." 
                           style="padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 70%; margin-left: 10px;">
                    <button onclick="quickTestWiFiNetwork()" 
                            style="padding: 8px 15px; background: #28a745; color: white; border: none; border-radius: 4px;">
                        ✅ اختبار سريع
                    </button>
                </div>
                <div id="quickTestResult" style="margin-top: 10px;"></div>
            </div>
            
            <!-- حلول مقترحة -->
            <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                <h5 style="margin-top: 0; color: #856404;">💡 حلول للمشاكل الشائعة:</h5>
                <ul style="font-size: 14px;">
                    <li><strong>الشبكة غير موجودة:</strong> تأكد من أن المدير أضافها في إدارة الفروع</li>
                    <li><strong>خطأ في الكتابة:</strong> انسخ والصق اسم الشبكة من إعدادات الجهاز</li>
                    <li><strong>مسافات إضافية:</strong> احذف المسافات قبل وبعد اسم الشبكة</li>
                    <li><strong>أحرف خاصة:</strong> تأكد من الأحرف الخاصة (_, -, عربي/إنجليزي)</li>
                    <li><strong>حساسية الأحرف:</strong> النظام يدعم الآن البحث المرن</li>
                </ul>
            </div>
            
            <!-- أزرار الإدارة -->
            <div style="text-align: center; border-top: 1px solid #eee; padding-top: 15px;">
                <button onclick="refreshBranchWiFiData().then(() => showWiFiDiagnostic())" 
                        style="padding: 10px 15px; background: #17a2b8; color: white; border: none; border-radius: 5px; margin: 5px;">
                    🔄 تحديث البيانات
                </button>
                <button onclick="testSystemDiagnostic()" 
                        style="padding: 10px 15px; background: #6c757d; color: white; border: none; border-radius: 5px; margin: 5px;">
                    🔍 فحص شامل
                </button>
                ${currentUser.role === 'manager' ? `
                <button onclick="showTab('branches')" 
                        style="padding: 10px 15px; background: #28a745; color: white; border: none; border-radius: 5px; margin: 5px;">
                    🏢 إدارة الفروع
                </button>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.className = 'wifi-diagnostic-modal';
    document.body.appendChild(modal);
    
    console.log('🔍 تشخيص WiFi - معلومات كاملة:', {
        branches,
        currentUser,
        dbType,
        totalNetworks
    });
}

// اختبار سريع لشبكة معينة
function quickTestWiFiNetwork() {
    const networkName = document.getElementById('quickTestNetwork').value.trim();
    const resultDiv = document.getElementById('quickTestResult');
    
    if (!networkName) {
        resultDiv.innerHTML = '<p style="color: #dc3545;">⚠️ يرجى إدخال اسم الشبكة</p>';
        return;
    }
    
    // البحث الدقيق
    let foundBranch = null;
    let matchType = '';
    
    for (const branch of branches) {
        const networks = branch.wifiNetworks || [];
        
        // تطابق دقيق
        if (networks.includes(networkName)) {
            foundBranch = branch;
            matchType = 'تطابق دقيق ✅';
            break;
        }
        
        // تطابق جزئي
        for (const network of networks) {
            if (network.toLowerCase().includes(networkName.toLowerCase()) || 
                networkName.toLowerCase().includes(network.toLowerCase())) {
                foundBranch = branch;
                matchType = 'تطابق جزئي ⚠️';
                break;
            }
        }
        if (foundBranch) break;
    }
    
    if (foundBranch) {
        resultDiv.innerHTML = `
            <div style="background: #d4edda; padding: 10px; border-radius: 5px; color: #155724;">
                <strong>✅ النتيجة: ${matchType}</strong><br>
                📶 الشبكة: "${networkName}"<br>
                🏢 الفرع: ${foundBranch.name}<br>
                📋 الشبكات المُسجلة: ${(foundBranch.wifiNetworks || []).join(', ')}
            </div>
        `;
    } else {
        resultDiv.innerHTML = `
            <div style="background: #f8d7da; padding: 10px; border-radius: 5px; color: #721c24;">
                <strong>❌ الشبكة غير موجودة</strong><br>
                📶 "${networkName}" غير مُسجلة في أي فرع
            </div>
        `;
    }
}

// ===== وظائف البيان المالي للموظف =====

// تهيئة البيانات المالية للموظف
function initializeEmployeeFinancialData() {
    if (!currentUser || currentUser.role !== 'employee') {
        return;
    }

    console.log('🔄 تهيئة البيانات المالية للموظف:', currentUser.name);

    // عرض معلومات الموظف المالية
    const currencySymbol = getCurrencySymbol(currentUser.currency || 'SAR');
    document.getElementById('employeeSalaryDisplay').textContent = currentUser.salary?.toLocaleString() || '0';
    document.getElementById('employeeCurrencyDisplay').textContent = currencySymbol;
    
    // حساب معدل الساعة ومعدل اليوم
    const dailyRate = (currentUser.salary || 0) / 6; // 6 أيام عمل
    const hourlyRate = dailyRate / 10.5; // 10.5 ساعة عمل يومياً
    
    document.getElementById('hourlyRateDisplay').textContent = hourlyRate.toFixed(2);
    document.getElementById('dailyRateDisplay').textContent = dailyRate.toFixed(2);
    
    // تعيين الأسبوع الحالي
    const now = new Date();
    const year = now.getFullYear();
    const weekNum = getWeekNumber(now);
    const weekInput = document.getElementById('employeeWeekSelect');
    if (weekInput) {
        weekInput.value = `${year}-W${weekNum.toString().padStart(2, '0')}`;
    }
    
    // تحميل البيان المالي للأسبوع الحالي (بيانات حقيقية فقط)
    loadEmployeeFinancialReport();
    
    // ملاحظة: البيانات التجريبية لن تُضاف تلقائياً
    // يمكن إضافتها يدوياً عند الحاجة باستخدام زر "إصلاح فوري"
    
    // رسالة ترحيب للموظف
    console.log('🎉 أهلاً وسهلاً في نظام إدارة الموارد البشرية!');
    console.log('📊 إذا كانت البيانات المالية تظهر "تجريبية"، اضغط زر "🗑️ حذف التجريبية"');
    console.log('💡 إذا لم تظهر البيانات المالية، اضغط زر "📋 عرض جميع البيانات المالية"');
    console.log('🔧 إذا كانت البيانات موجودة لكن لا تظهر في الأسبوع: "🔍 تشخيص التواريخ" ثم "🔧 إصلاح التواريخ"');
    console.log('💻 للتشخيص المفصل، استخدم: diagnoseDateIssues() أو showSystemStatus()');
}

// إضافة بيانات تجريبية للاختبار (مع منع التكرار)
function addSampleFinancialData() {
    if (!currentUser || currentUser.role !== 'employee') {
        return;
    }

    // التحقق من وجود بيانات مالية للموظف
    const existingFinances = finances.filter(fin => fin.employeeId === currentUser.id);
    console.log('📊 البيانات المالية الموجودة للموظف:', existingFinances.length);
    
    // التحقق من وجود بيانات تجريبية بالفعل
    const existingSampleData = existingFinances.filter(fin => 
        fin.reason && (
            fin.reason.includes('تجريبية') || 
            fin.reason.includes('للعرض') || 
            fin.reason.includes('إجبارية') ||
            fin.id.includes('sample') ||
            fin.id.includes('forced')
        )
    );
    
    if (existingSampleData.length > 0) {
        console.log('⚠️ توجد بيانات تجريبية بالفعل:', existingSampleData.length, 'عملية');
        console.log('🚫 تم تخطي إضافة بيانات جديدة لمنع التكرار');
        return;
    }
    
    // إضافة بيانات تجريبية فقط إذا لم تكن موجودة
    console.log('➕ إضافة بيانات تجريبية جديدة...');
    
    const today = new Date().toISOString().split('T')[0];
    
    // إضافة سلفة تجريبية
    const sampleAdvance = {
        id: 'sample-advance-' + Date.now(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        type: 'advance',
        amount: 500,
        reason: 'سلفة تجريبية أولى',
        date: today
    };
    
    // إضافة خصم تجريبي
    const sampleDeduction = {
        id: 'sample-deduction-' + Date.now(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        type: 'deduction',
        amount: 100,
        reason: 'خصم تجريبي أولي',
        date: today
    };
    
    finances.push(sampleAdvance);
    finances.push(sampleDeduction);
    
    console.log('✅ تم إضافة بيانات تجريبية جديدة:', { sampleAdvance, sampleDeduction });
    
    // حفظ البيانات المحلية
    saveData();
}

// تحميل البيان المالي للموظف
function loadEmployeeFinancialReport() {
    if (!currentUser || currentUser.role !== 'employee') {
        console.error('الوصول مسموح للموظفين فقط');
        return;
    }

    const weekSelect = document.getElementById('employeeWeekSelect');
    const selectedWeek = weekSelect.value;
    
    if (!selectedWeek) {
        console.error('يرجى اختيار أسبوع');
        return;
    }

    console.log('🔍 بدء تحميل البيان المالي للموظف:', currentUser.name);
    console.log('📅 الأسبوع المختار:', selectedWeek);
    console.log('👤 معرف الموظف:', currentUser.id);
    console.log('💰 إجمالي العمليات المالية في النظام:', finances.length);

    const [year, weekNum] = selectedWeek.split('-W');
    const startDate = getDateOfWeek(year, weekNum);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    console.log('📅 تواريخ الأسبوع:', {
        start: formatDate(startDate),
        end: formatDate(endDate)
    });
    
    // الحصول على بيانات الحضور للأسبوع
    const weekAttendance = attendance.filter(att => {
        const attDate = new Date(att.date);
        return att.employeeId === currentUser.id && 
               attDate >= startDate && attDate <= endDate;
    });
    
    console.log('📊 سجلات الحضور للأسبوع:', weekAttendance.length);
    
    // طباعة جميع العمليات المالية للموظف (بدون فلترة الأسبوع)
    const allEmployeeFinances = finances.filter(fin => fin.employeeId === currentUser.id);
    console.log('💼 جميع العمليات المالية للموظف:', allEmployeeFinances.length);
    console.log('💼 تفاصيل العمليات المالية:', allEmployeeFinances);
    
    // الحصول على البيانات المالية للأسبوع (مع تحويل التاريخ بشكل صحيح وتشخيص مفصل)
    const weekFinances = finances.filter(fin => {
        if (!fin.date || fin.employeeId !== currentUser.id) return false;
        
        console.log(`🔍 فحص العملية المالية: ${fin.reason} (${fin.date})`);
        
        // محاولة تحويل التاريخ بطرق مختلفة
        let finDate = null;
        let dateFormat = '';
        
        // محاولة 1: تاريخ ISO أو قياسي
        finDate = new Date(fin.date);
        if (!isNaN(finDate.getTime())) {
            dateFormat = 'ISO/Standard';
        } else {
            // محاولة 2: تنسيق DD-MM-YYYY أو DD/MM/YYYY
            const dateParts = fin.date.split(/[-\/]/);
            if (dateParts.length === 3) {
                const [day, month, year] = dateParts;
                if (day && month && year) {
                    finDate = new Date(year, month - 1, day);
                    dateFormat = 'DD-MM-YYYY';
                }
            }
        }
        
        if (!finDate || isNaN(finDate.getTime())) {
            console.log(`   ❌ فشل في تحويل التاريخ: "${fin.date}"`);
            return false;
        }
        
        // إزالة الوقت للمقارنة (مقارنة التواريخ فقط)
        const finDateOnly = new Date(finDate.getFullYear(), finDate.getMonth(), finDate.getDate());
        const startDateOnly = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        const endDateOnly = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        const isInRange = finDateOnly >= startDateOnly && finDateOnly <= endDateOnly;
        
        console.log(`   📅 التاريخ المحول: ${formatDate(finDate)} (تنسيق: ${dateFormat})`);
        console.log(`   📅 فترة الأسبوع: ${formatDate(startDate)} → ${formatDate(endDate)}`);
        console.log(`   🎯 في النطاق: ${isInRange ? '✅ نعم' : '❌ لا'}`);
        
        return isInRange;
    });
    
    console.log('📊 العمليات المالية للأسبوع:', weekFinances.length);
    console.log('📊 تفاصيل العمليات المالية للأسبوع:', weekFinances);
    
    // حساب المعدلات
    const dailyRate = (currentUser.salary || 0) / 6;
    const hourlyRate = dailyRate / 10.5;
    const currencySymbol = getCurrencySymbol(currentUser.currency || 'SAR');
    
    console.log('💰 المعدلات المالية:', {
        salary: currentUser.salary,
        dailyRate: dailyRate.toFixed(2),
        hourlyRate: hourlyRate.toFixed(2),
        currency: currencySymbol
    });
    
    // حساب الإحصائيات مع دعم الساعات الإضافية
    let totalHours = 0;
    let totalMinutes = 0;
    let totalSeconds = 0;
    let totalEarnings = 0;
    let totalRegularHours = 0;
    let totalOvertimeHours = 0;
    let workDays = 0;
    
    // معالجة بيانات الحضور
    weekAttendance.forEach(att => {
        if (att.checkIn && att.checkOut) {
            const timeCalc = calculatePreciseTime(att.checkIn, att.checkOut, att.date);
            totalHours += Math.floor(timeCalc.totalMs / (1000 * 60 * 60));
            totalMinutes += Math.floor((timeCalc.totalMs % (1000 * 60 * 60)) / (1000 * 60));
            totalSeconds += Math.floor((timeCalc.totalMs % (1000 * 60)) / 1000);
            
            // استخدام الساعات الفعالة (عادية + إضافي × 1.5)
            totalEarnings += timeCalc.effectiveHours * hourlyRate;
            totalRegularHours += timeCalc.regularHours || 0;
            totalOvertimeHours += timeCalc.overtimeHours || 0;
            workDays++;
        }
    });
    
    // تحويل الثواني والدقائق الزائدة إلى ساعات
    totalMinutes += Math.floor(totalSeconds / 60);
    totalSeconds = totalSeconds % 60;
    totalHours += Math.floor(totalMinutes / 60);
    totalMinutes = totalMinutes % 60;
    
    console.log('⏱️ إحصائيات الحضور مع الإضافي:', {
        totalHours: totalHours,
        totalMinutes: totalMinutes,
        totalSeconds: totalSeconds,
        totalRegularHours: totalRegularHours.toFixed(2),
        totalOvertimeHours: totalOvertimeHours.toFixed(2),
        totalEarnings: totalEarnings.toFixed(2),
        workDays: workDays
    });
    
    // حساب الخصومات والسلف والمدفوعات
    let totalDeductions = 0;
    let totalAdvances = 0;
    let totalPayments = 0;
    
    weekFinances.forEach(fin => {
        console.log(`💰 معالجة عملية: ${fin.type} - ${fin.amount} - ${fin.reason}`);
        if (fin.type === 'deduction') {
            totalDeductions += fin.amount;
        } else if (fin.type === 'advance') {
            totalAdvances += fin.amount;
        } else if (fin.type === 'payment') {
            totalPayments += fin.amount;
        }
    });
    
    console.log('💰 الإجماليات المالية:', {
        totalDeductions: totalDeductions.toFixed(2),
        totalAdvances: totalAdvances.toFixed(2),
        totalPayments: totalPayments.toFixed(2)
    });
    
    // حساب صافي المبلغ (السلفة والمدفوعات تُخصم من المبلغ المستحق)
    const grossAmount = totalEarnings - totalDeductions - totalAdvances;
    const netAmount = grossAmount - totalPayments;
    
    console.log('💰 النتيجة النهائية:', {
        grossAmount: grossAmount.toFixed(2),
        netAmount: netAmount.toFixed(2)
    });
    
    // تحديث الواجهة
    updateEmployeeFinancialSummary({
        totalHours: `${totalHours.toString().padStart(2, '0')}:${totalMinutes.toString().padStart(2, '0')}:${totalSeconds.toString().padStart(2, '0')}`,
        totalEarnings: totalEarnings.toFixed(2),
        totalDeductions: totalDeductions.toFixed(2),
        totalAdvances: totalAdvances.toFixed(2),
        totalPayments: totalPayments.toFixed(2),
        netAmount: netAmount.toFixed(2),
        currencySymbol: currencySymbol
    });
    
    console.log('✅ تم تحديث الواجهة بنجاح');
    
    // تحديث جدول تفاصيل الحضور
    updateEmployeeAttendanceTable(weekAttendance, startDate, endDate, hourlyRate, currencySymbol);
    
    // تحديث جدول العمليات المالية
    updateEmployeeFinancialTransactions(weekFinances, currencySymbol);
    
    // فحص نوع البيانات وإظهار التنبيهات إذا لزم الأمر
    checkDataTypeAndShowWarnings();
}

// تحديث ملخص البيان المالي
function updateEmployeeFinancialSummary(data) {
    console.log('🔄 تحديث ملخص البيان المالي مع البيانات:', data);
    
    const elements = {
        totalWorkHours: document.getElementById('totalWorkHours'),
        totalEarnings: document.getElementById('totalEarnings'),
        totalDeductions: document.getElementById('totalDeductions'),
        totalAdvances: document.getElementById('totalAdvances'),
        totalPayments: document.getElementById('totalPayments'),
        netAmount: document.getElementById('netAmount')
    };
    
    // التحقق من وجود العناصر
    Object.keys(elements).forEach(key => {
        if (!elements[key]) {
            console.error(`❌ العنصر ${key} غير موجود في الصفحة`);
        }
    });
    
    if (elements.totalWorkHours) elements.totalWorkHours.textContent = data.totalHours;
    if (elements.totalEarnings) elements.totalEarnings.textContent = `${data.totalEarnings} ${data.currencySymbol}`;
    if (elements.totalDeductions) elements.totalDeductions.textContent = `${data.totalDeductions} ${data.currencySymbol}`;
    if (elements.totalAdvances) elements.totalAdvances.textContent = `${data.totalAdvances} ${data.currencySymbol}`;
    if (elements.totalPayments) elements.totalPayments.textContent = `${data.totalPayments} ${data.currencySymbol}`;
    if (elements.netAmount) elements.netAmount.textContent = `${data.netAmount} ${data.currencySymbol}`;
    
    console.log('✅ تم تحديث جميع عناصر البيان المالي');
}

// تحديث جدول تفاصيل الحضور المالي
function updateEmployeeAttendanceTable(weekAttendance, startDate, endDate, hourlyRate, currencySymbol) {
    const tbody = document.getElementById('financialAttendanceTableBody');
    tbody.innerHTML = '';
    
    const dailyRate = hourlyRate * 10.5;
    const arabicDays = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    
    // إنشاء صف لكل يوم في الأسبوع
    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(startDate);
        currentDate.setDate(startDate.getDate() + i);
        
        const dateStr = getLocalDateISO(currentDate); // استخدام التاريخ المحلي بدلاً من UTC
        const dayName = arabicDays[currentDate.getDay()];
        const isWeekend = currentDate.getDay() === 5; // الجمعة
        
        const attendanceRecord = weekAttendance.find(att => att.date === dateStr);
        
        const row = document.createElement('tr');
        
        // تحديد لون الصف حسب الحالة
        if (isWeekend) {
            row.style.backgroundColor = '#e3f2fd'; // أزرق فاتح للجمعة
        } else if (attendanceRecord && attendanceRecord.checkIn && attendanceRecord.checkOut) {
            row.style.backgroundColor = '#d4edda'; // أخضر للحضور الكامل
        } else if (attendanceRecord && attendanceRecord.checkIn) {
            row.style.backgroundColor = '#fff3cd'; // أصفر للحضور بدون انصراف
        } else {
            row.style.backgroundColor = '#f8d7da'; // أحمر للغياب
        }
        
        let checkInTime = '--';
        let checkOutTime = '--';
        let workHours = '00:00:00';
        let dayValue = '0.00';
        let status = '❌ غياب';
        
        if (isWeekend) {
            status = '🏖️ عطلة';
            dayValue = '--';
        } else if (attendanceRecord) {
            if (attendanceRecord.checkIn) {
                checkInTime = attendanceRecord.checkIn;
                if (attendanceRecord.checkOut) {
                    checkOutTime = attendanceRecord.checkOut;
                    const timeCalc = calculatePreciseTime(attendanceRecord.checkIn, attendanceRecord.checkOut, attendanceRecord.date);
                    workHours = timeCalc.display;
                    dayValue = (timeCalc.effectiveHours * hourlyRate).toFixed(2);
                    status = '✅ حضور كامل';
                    
                    // إضافة معلومات إضافية عن الساعات الإضافية
                    if (timeCalc.overtimeHours > 0) {
                        status += ` (إضافي: ${timeCalc.overtimeHours.toFixed(1)}س)`;
                    }
                } else {
                    status = '⚠️ لم ينصرف';
                }
            }
        }
        
        row.innerHTML = `
            <td>${formatDate(currentDate)}</td>
            <td>${dayName}</td>
            <td>${checkInTime}</td>
            <td>${checkOutTime}</td>
            <td>${workHours}</td>
            <td>${dayValue === '--' ? '--' : `${dayValue} ${currencySymbol}`}</td>
            <td>${status}</td>
        `;
        
        tbody.appendChild(row);
    }
}

// تحديث جدول العمليات المالية
function updateEmployeeFinancialTransactions(weekFinances, currencySymbol) {
    const tbody = document.getElementById('financialTransactionsTableBody');
    tbody.innerHTML = '';
    
    // فحص إذا كانت هناك بيانات مالية للموظف (كل الفترات)
    const allEmployeeFinances = finances.filter(fin => fin.employeeId === currentUser.id);
    
    if (weekFinances.length === 0) {
        if (allEmployeeFinances.length > 0) {
            // توجد بيانات مالية لكن ليس في هذا الأسبوع
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align: center; color: #666; padding: 20px;">
                        <div style="margin-bottom: 10px;">لا توجد عمليات مالية في هذا الأسبوع</div>
                        <div style="color: #007bff; margin-bottom: 10px;">
                            💡 لديك ${allEmployeeFinances.length} عملية مالية في فترات أخرى
                        </div>
                        <button onclick="showAllEmployeeFinancialData()" 
                                style="background: #007bff; color: white; border: none; padding: 8px 15px; border-radius: 4px; cursor: pointer;">
                            📋 عرض جميع البيانات المالية
                        </button>
                    </td>
                </tr>
            `;
        } else {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: #666;">لا توجد عمليات مالية</td></tr>';
        }
        return;
    }
    
    weekFinances.forEach(fin => {
        const row = document.createElement('tr');
        
        // تحديد نوع العملية ولونها
        let typeText, typeColor;
        if (fin.type === 'deduction') {
            typeText = 'خصم';
            typeColor = '#dc3545';
        } else if (fin.type === 'advance') {
            typeText = 'سلفة';
            typeColor = '#007bff';
        } else if (fin.type === 'payment') {
            typeText = 'تسليم راتب';
            typeColor = '#28a745';
        } else {
            typeText = fin.type;
            typeColor = '#6c757d';
        }
        
        row.innerHTML = `
            <td>${formatDate(fin.date)}</td>
            <td><span style="color: ${typeColor}; font-weight: bold;">${typeText}</span></td>
            <td>${fin.amount.toFixed(2)} ${currencySymbol}</td>
            <td>${fin.reason}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// طباعة البيان المالي للموظف
function printEmployeeFinancialReport() {
    const weekSelect = document.getElementById('employeeWeekSelect');
    const selectedWeek = weekSelect.value;
    
    if (!selectedWeek) {
        alert('يرجى اختيار أسبوع أولاً');
        return;
    }
    
    const [year, weekNum] = selectedWeek.split('-W');
    const startDate = getDateOfWeek(year, weekNum);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const printWindow = window.open('', '_blank');
    const currencySymbol = getCurrencySymbol(currentUser.currency || 'SAR');
    
    // الحصول على البيانات من الواجهة
    const totalHours = document.getElementById('totalWorkHours').textContent;
    const totalEarnings = document.getElementById('totalEarnings').textContent;
    const totalDeductions = document.getElementById('totalDeductions').textContent;
    const totalAdvances = document.getElementById('totalAdvances').textContent;
    const totalPayments = document.getElementById('totalPayments').textContent;
    const netAmount = document.getElementById('netAmount').textContent;
    
    const printContent = `
        <!DOCTYPE html>
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <title>البيان المالي - ${currentUser.name}</title>
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    margin: 0;
                    padding: 20px;
                    background: white;
                    color: #333;
                }
                .header {
                    text-align: center;
                    margin-bottom: 30px;
                    border-bottom: 2px solid #007bff;
                    padding-bottom: 20px;
                }
                .header h1 {
                    color: #007bff;
                    margin: 0;
                }
                .employee-info {
                    background: #f8f9fa;
                    padding: 20px;
                    border-radius: 8px;
                    margin-bottom: 20px;
                }
                .summary-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                    gap: 15px;
                    margin: 20px 0;
                }
                .summary-item {
                    background: #f8f9fa;
                    padding: 15px;
                    border-radius: 8px;
                    text-align: center;
                    border-left: 4px solid #007bff;
                }
                .summary-item h4 {
                    margin: 0 0 10px 0;
                    color: #495057;
                }
                .summary-item p {
                    margin: 0;
                    font-size: 18px;
                    font-weight: bold;
                    color: #007bff;
                }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin: 20px 0;
                    background: white;
                }
                th, td {
                    padding: 12px;
                    text-align: center;
                    border: 1px solid #ddd;
                }
                th {
                    background: #007bff;
                    color: white;
                    font-weight: bold;
                }
                .footer {
                    text-align: center;
                    margin-top: 30px;
                    font-size: 14px;
                    color: #666;
                }
                @media print {
                    body { margin: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>💰 البيان المالي للموظف</h1>
                <h2>نظام إدارة الموارد البشرية</h2>
            </div>
            
            <div class="employee-info">
                <h3>معلومات الموظف</h3>
                <p><strong>الاسم:</strong> ${currentUser.name}</p>
                <p><strong>المنصب:</strong> ${currentUser.position}</p>
                <p><strong>الراتب الشهري:</strong> ${currentUser.salary?.toLocaleString()} ${currencySymbol}</p>
                <p><strong>الفترة:</strong> من ${formatDate(startDate)} إلى ${formatDate(endDate)}</p>
            </div>
            
            <div class="summary-grid">
                <div class="summary-item">
                    <h4>⏱️ ساعات العمل</h4>
                    <p>${totalHours}</p>
                </div>
                <div class="summary-item">
                    <h4>💰 المبلغ المستحق</h4>
                    <p>${totalEarnings}</p>
                </div>
                <div class="summary-item">
                    <h4>➖ الخصومات</h4>
                    <p>${totalDeductions}</p>
                </div>
                <div class="summary-item">
                    <h4>➕ السلف</h4>
                    <p>${totalAdvances}</p>
                </div>
                <div class="summary-item">
                    <h4>✅ المدفوع مسبقاً</h4>
                    <p style="color: #17a2b8;">${totalPayments}</p>
                </div>
                <div class="summary-item" style="border-left-color: #28a745;">
                    <h4>💵 صافي المبلغ</h4>
                    <p style="color: #28a745;">${netAmount}</p>
                </div>
            </div>
            
            <h3>📋 تفاصيل الحضور</h3>
            <table>
                ${document.getElementById('financialAttendanceTable').innerHTML}
            </table>
            
            <h3>💼 العمليات المالية</h3>
            <table>
                ${document.getElementById('financialTransactionsTable').innerHTML}
            </table>
            
            <div class="footer">
                <p>تم إنشاء هذا التقرير في ${formatDateTime(new Date())}</p>
                <p>نظام إدارة الموارد البشرية - جميع الحقوق محفوظة</p>
            </div>
        </body>
        </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.print();
}

// تصدير البيان المالي كـ Excel
function exportEmployeeFinancialReport() {
    const weekSelect = document.getElementById('employeeWeekSelect');
    const selectedWeek = weekSelect.value;
    
    if (!selectedWeek) {
        alert('يرجى اختيار أسبوع أولاً');
        return;
    }
    
    const [year, weekNum] = selectedWeek.split('-W');
    const startDate = getDateOfWeek(year, weekNum);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    // إنشاء بيانات CSV
    const csvData = [];
    csvData.push(['البيان المالي للموظف']);
    csvData.push(['']);
    csvData.push(['الاسم', currentUser.name]);
    csvData.push(['المنصب', currentUser.position]);
    csvData.push(['الراتب الشهري', `${currentUser.salary?.toLocaleString()} ${getCurrencySymbol(currentUser.currency || 'SAR')}`]);
    csvData.push(['الفترة', `من ${formatDate(startDate)} إلى ${formatDate(endDate)}`]);
    csvData.push(['']);
    csvData.push(['الملخص المالي']);
    csvData.push(['ساعات العمل', document.getElementById('totalWorkHours').textContent]);
    csvData.push(['المبلغ المستحق', document.getElementById('totalEarnings').textContent]);
    csvData.push(['الخصومات', document.getElementById('totalDeductions').textContent]);
    csvData.push(['السلف', document.getElementById('totalAdvances').textContent]);
    csvData.push(['المدفوع مسبقاً', document.getElementById('totalPayments').textContent]);
    csvData.push(['صافي المبلغ', document.getElementById('netAmount').textContent]);
    csvData.push(['']);
    csvData.push(['تفاصيل الحضور']);
    csvData.push(['التاريخ', 'اليوم', 'الحضور', 'الانصراف', 'ساعات العمل', 'قيمة اليوم', 'الحالة']);
    
    // إضافة بيانات الحضور
    const attendanceRows = document.getElementById('financialAttendanceTableBody').querySelectorAll('tr');
    attendanceRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = Array.from(cells).map(cell => cell.textContent.trim());
        csvData.push(rowData);
    });
    
    csvData.push(['']);
    csvData.push(['العمليات المالية']);
    csvData.push(['التاريخ', 'النوع', 'المبلغ', 'السبب']);
    
    // إضافة بيانات العمليات المالية
    const financeRows = document.getElementById('financialTransactionsTableBody').querySelectorAll('tr');
    financeRows.forEach(row => {
        const cells = row.querySelectorAll('td');
        const rowData = Array.from(cells).map(cell => cell.textContent.trim());
        csvData.push(rowData);
    });
    
    // تحويل إلى CSV
    const csvContent = csvData.map(row => row.join(',')).join('\n');
    
    // إنشاء ملف للتنزيل
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `البيان_المالي_${currentUser.name}_${selectedWeek}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// دالة تسجيل تسليم الراتب
async function markSalaryAsPaid(employeeId, week, amount, currencySymbol) {
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) {
        alert('الموظف غير موجود');
        return;
    }
    
    // تأكيد عملية التسليم
    const confirmMessage = `هل أنت متأكد من تسجيل تسليم راتب ${employee.name}؟\n\nالمبلغ: ${amount} ${currencySymbol.replace(/[^\w]/g, '')}\nالأسبوع: ${week}`;
    
    if (!confirm(confirmMessage)) {
        return;
    }
    
    try {
        // حساب تواريخ الأسبوع
        const [year, weekNum] = week.split('-W');
        const startDate = getDateOfWeek(year, weekNum);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6);
        
        // إنشاء سجل تسليم الراتب
        const paymentRecord = {
            id: generateTempId(),
            employeeId: employeeId,
            employeeName: employee.name,
            type: 'payment',
            amount: parseFloat(amount),
            reason: `تسليم راتب أسبوع ${week} (${formatDate(startDate)} - ${formatDate(endDate)})`,
            date: getLocalDateISO(), // حفظ بتنسيق ISO محلي للتوافق مع قاعدة البيانات
            weekPaid: week
        };
        
        // حفظ في قاعدة البيانات النشطة
        const savedPayment = await saveToActiveDatabase('finance', paymentRecord);
        
        if (savedPayment && savedPayment.id) {
            paymentRecord.id = savedPayment.id;
        }
        
        // إضافة إلى البيانات المحلية
        finances.push(paymentRecord);
        saveData();
        
        // تحديث قائمة العمليات المالية
        loadFinancesList();
        
        // تحديث التقرير الأسبوعي
        generateWeeklyReport();
        
        // رسالة نجاح
        alert(`✅ تم تسجيل تسليم راتب ${employee.name} بنجاح\n\nالمبلغ: ${amount} ${currencySymbol.replace(/[^\w]/g, '')}\nالتاريخ: ${formatDate(new Date())}`);
        
        console.log('✅ تم تسجيل تسليم الراتب:', paymentRecord);
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل تسليم الراتب:', error);
        alert('❌ حدث خطأ في تسجيل التسليم. يرجى المحاولة مرة أخرى.');
    }
}

// دالة تسجيل الدخول الرئيسية
async function authenticate(event) {
    event.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    const errorMessage = document.getElementById('errorMessage');
    
    // إخفاء رسالة الخطأ السابقة
    errorMessage.style.display = 'none';
    
    if (!username || !password) {
        errorMessage.textContent = 'يرجى إدخال اسم المستخدم وكلمة المرور';
        errorMessage.style.display = 'block';
        return;
    }
    
    try {
        // تجربة تسجيل الدخول من Supabase أولاً
        console.log('🔐 محاولة تسجيل الدخول...');
        const supabaseUser = await authenticateFromSupabase(username, password);
        
        if (supabaseUser) {
            console.log('✅ تم تسجيل الدخول بنجاح من Supabase:', supabaseUser.name);
            currentUser = supabaseUser;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // إخفاء نموذج تسجيل الدخول وعرض لوحة التحكم
            document.getElementById('loginContainer').style.display = 'none';
            
            if (currentUser.role === 'manager') {
                showManagerDashboard();
            } else {
                showEmployeeDashboard();
            }
            return;
        }
        
        // إذا فشل Supabase، جرب المصادقة المحلية
        console.log('⚠️ فشل تسجيل الدخول من Supabase، جاري المحاولة محلياً...');
        
        // البحث في البيانات المحلية
        const user = employees.find(emp => 
            emp.username === username && emp.password === password
        );
        
        if (user) {
            console.log('✅ تم تسجيل الدخول محلياً:', user.name);
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            
            // إخفاء نموذج تسجيل الدخول وعرض لوحة التحكم
            document.getElementById('loginContainer').style.display = 'none';
            
            if (currentUser.role === 'manager') {
                showManagerDashboard();
            } else {
                showEmployeeDashboard();
            }
        } else {
            throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
        }
        
    } catch (error) {
        console.error('❌ خطأ في تسجيل الدخول:', error);
        errorMessage.textContent = error.message || 'حدث خطأ في تسجيل الدخول';
        errorMessage.style.display = 'block';
    }
}

// ===== دوال تجريبية للاختبار =====

// دالة لإضافة بيانات مالية للاختبار (يمكن استدعاؤها من وحدة التحكم)
function addTestFinancialData(employeeId, type, amount, reason) {
    if (!employeeId || !['advance', 'deduction', 'payment'].includes(type)) {
        console.error('❌ معطيات غير صحيحة. الاستخدام: addTestFinancialData(employeeId, "advance|deduction|payment", amount, reason)');
        return;
    }
    
    const employee = employees.find(emp => emp.id === employeeId);
    if (!employee) {
        console.error('❌ الموظف غير موجود');
        return;
    }
    
    const testRecord = {
        id: 'test-' + type + '-' + Date.now(),
        employeeId: employeeId,
        employeeName: employee.name,
        type: type,
        amount: parseFloat(amount),
        reason: reason || `${type} تجريبي`,
        date: new Date().toISOString().split('T')[0]
    };
    
    finances.push(testRecord);
    saveData();
    
    console.log('✅ تم إضافة بيانات مالية تجريبية:', testRecord);
    
    // إذا كان المستخدم الحالي هو نفس الموظف، قم بتحديث البيان
    if (currentUser && currentUser.id === employeeId && currentUser.role === 'employee') {
        loadEmployeeFinancialReport();
    }
    
    // تحديث التقرير الأسبوعي إذا كان مفتوحاً
    if (document.getElementById('managerDashboard') && document.getElementById('managerDashboard').style.display !== 'none') {
        generateWeeklyReport();
    }
}

// دالة لعرض البيانات المالية للموظف (للاختبار)
function showEmployeeFinances(employeeId) {
    const empFinances = finances.filter(fin => fin.employeeId === (employeeId || currentUser?.id));
    console.log('📊 البيانات المالية للموظف:', empFinances);
    return empFinances;
}

// دالة لحذف البيانات المالية التجريبية
function clearTestFinancialData(employeeId) {
    const originalLength = finances.length;
    finances = finances.filter(fin => !(fin.employeeId === employeeId && fin.id.startsWith('test-')));
    saveData();
    
    const deletedCount = originalLength - finances.length;
    console.log(`✅ تم حذف ${deletedCount} سجل مالي تجريبي`);
    
    // إذا كان المستخدم الحالي هو نفس الموظف، قم بتحديث البيان
    if (currentUser && currentUser.id === employeeId && currentUser.role === 'employee') {
        loadEmployeeFinancialReport();
    }
}

// دالة لإعادة تحميل البيان المالي (للاختبار)
function refreshEmployeeFinancialReport() {
    if (currentUser && currentUser.role === 'employee') {
        console.log('🔄 إعادة تحميل البيان المالي...');
        loadEmployeeFinancialReport();
    } else {
        console.error('❌ يجب تسجيل الدخول كموظف أولاً');
    }
}

// دالة لطباعة معلومات التشخيص
function printDiagnosticInfo() {
    console.log('🔍 معلومات التشخيص:');
    console.log('المستخدم الحالي:', currentUser);
    console.log('عدد الموظفين:', employees.length);
    console.log('عدد سجلات الحضور:', attendance.length);
    console.log('عدد العمليات المالية:', finances.length);
    console.log('العمليات المالية:', finances);
    
    if (currentUser && currentUser.role === 'employee') {
        const empFinances = finances.filter(fin => fin.employeeId === currentUser.id);
        console.log('العمليات المالية للموظف الحالي:', empFinances);
    }
}

// دالة إصلاح فوري للبيانات المالية
function forceFixFinancialDisplay() {
    if (!currentUser || currentUser.role !== 'employee') {
        return;
    }

    console.log('🚨 بدء الإصلاح الإجباري للبيانات المالية...');
    
    // 1. فحص البيانات الموجودة
    const analysis = analyzeFinancialData();
    
    if (analysis.realData.length > 0) {
        console.log('✅ توجد بيانات حقيقية - سيتم عرضها بدلاً من إضافة بيانات تجريبية');
        console.log('📋 البيانات الحقيقية الموجودة:', analysis.realData.length, 'عملية');
        
        // إزالة البيانات التجريبية إن وجدت وعرض الحقيقية فقط
        if (analysis.testData.length > 0) {
            removeTestDataOnly();
        }
    } else {
        console.log('⚠️ لا توجد بيانات حقيقية - سيتم إضافة بيانات تجريبية للعرض');
        
        // 2. إضافة بيانات مالية إجبارياً
        forcedAddFinancialData();
        
        // 3. تحديث فوري للواجهة
        forceUpdateFinancialSummary();
    }
    
    // 4. التأكد من وجود عناصر HTML
    ensureFinancialElements();
    
    // 5. إعادة تحميل البيان المالي
    setTimeout(() => {
        loadEmployeeFinancialReport();
    }, 500);
}

// إضافة بيانات مالية بشكل إجباري (مع منع التكرار)
function forcedAddFinancialData() {
    console.log('💪 فحص الحاجة لإضافة بيانات مالية إجبارياً...');
    
    // التحقق من وجود بيانات مالية للموظف الحالي
    const existingFinances = finances.filter(fin => fin.employeeId === currentUser.id);
    
    // التحقق من وجود بيانات إجبارية أو تجريبية بالفعل
    const existingForcedData = existingFinances.filter(fin => 
        fin.reason && (
            fin.reason.includes('إجبارية') || 
            fin.reason.includes('للعرض') ||
            fin.reason.includes('تجريبية') ||
            fin.id.includes('forced') ||
            fin.id.includes('sample')
        )
    );
    
    if (existingForcedData.length > 0) {
        console.log('⚠️ توجد بيانات إجبارية/تجريبية بالفعل:', existingForcedData.length, 'عملية');
        console.log('🚫 تم تخطي إضافة بيانات جديدة لمنع التكرار');
        return;
    }
    
    console.log('➕ إضافة بيانات إجبارية جديدة للعرض...');
    
    // إضافة بيانات جديدة إجبارياً
    const today = new Date().toISOString().split('T')[0];
    
    const forcedAdvance = {
        id: 'forced-advance-' + Date.now(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        type: 'advance',
        amount: 600,
        reason: 'سلفة إجبارية للعرض',
        date: today
    };
    
    const forcedDeduction = {
        id: 'forced-deduction-' + Date.now(),
        employeeId: currentUser.id,
        employeeName: currentUser.name,
        type: 'deduction',
        amount: 150,
        reason: 'خصم إجباري للعرض',
        date: today
    };
    
    finances.push(forcedAdvance);
    finances.push(forcedDeduction);
    
    console.log('✅ تم إضافة البيانات الإجبارية الجديدة:', { forcedAdvance, forcedDeduction });
    saveData();
}

// التأكد من وجود عناصر HTML المطلوبة
function ensureFinancialElements() {
    console.log('🔧 التحقق من عناصر HTML...');
    
    const requiredElements = [
        'totalWorkHours',
        'totalEarnings', 
        'totalDeductions',
        'totalAdvances',
        'totalPayments',
        'netAmount'
    ];
    
    requiredElements.forEach(elementId => {
        let element = document.getElementById(elementId);
        if (!element) {
            console.warn(`⚠️ العنصر ${elementId} غير موجود - سيتم إنشاؤه`);
            // يمكن هنا إضافة كود لإنشاء العنصر إذا لزم الأمر
        } else {
            console.log(`✅ العنصر ${elementId} موجود`);
        }
    });
}

// تحديث إجباري للواجهة المالية
function forceUpdateFinancialSummary() {
    console.log('🎯 تحديث إجباري للواجهة المالية...');
    
    const currencySymbol = getCurrencySymbol(currentUser.currency || 'SAR');
    
    // قيم افتراضية للعرض
    const defaultValues = {
        totalHours: '40:00:00',
        totalEarnings: '600.00',
        totalDeductions: '150.00',
        totalAdvances: '600.00',
        totalPayments: '0.00',
        netAmount: '-150.00'
    };
    
    // تحديث كل عنصر بشكل فردي
    const elements = {
        totalWorkHours: document.getElementById('totalWorkHours'),
        totalEarnings: document.getElementById('totalEarnings'),
        totalDeductions: document.getElementById('totalDeductions'),
        totalAdvances: document.getElementById('totalAdvances'),
        totalPayments: document.getElementById('totalPayments'),
        netAmount: document.getElementById('netAmount')
    };
    
    Object.keys(elements).forEach(key => {
        const element = elements[key];
        if (element) {
            const value = key === 'totalWorkHours' ? 
                defaultValues[key] : 
                `${defaultValues[key]} ${currencySymbol}`;
            
            element.textContent = value;
            element.style.color = '#333';
            element.style.fontWeight = 'bold';
            
            console.log(`✅ تم تحديث ${key}: ${value}`);
        } else {
            console.error(`❌ العنصر ${key} غير موجود!`);
        }
    });
    
    console.log('🎯 انتهى التحديث الإجباري');
}

// دالة تنظيف البيانات المالية المكررة
function cleanDuplicateFinancialData(employeeId = null) {
    const targetEmployeeId = employeeId || (currentUser ? currentUser.id : null);
    
    if (!targetEmployeeId) {
        console.error('❌ لا يوجد معرف موظف للتنظيف');
        return;
    }
    
    console.log('🧹 بدء تنظيف البيانات المالية المكررة للموظف:', targetEmployeeId);
    
    const originalLength = finances.length;
    
    // إزالة البيانات التجريبية والإجبارية المكررة
    const duplicateKeywords = [
        'تجريبية', 'إجبارية', 'للعرض', 'محسنة', 'محسن', 'أولى', 'أولي'
    ];
    
    // الاحتفاظ بواحدة فقط من كل نوع
    const uniqueFinances = [];
    const seenTypes = new Set();
    
    finances.forEach(fin => {
        if (fin.employeeId !== targetEmployeeId) {
            // الاحتفاظ بالبيانات للموظفين الآخرين
            uniqueFinances.push(fin);
            return;
        }
        
        const isDuplicate = duplicateKeywords.some(keyword => 
            fin.reason && fin.reason.includes(keyword)
        );
        
        if (!isDuplicate) {
            // الاحتفاظ بالبيانات الحقيقية (غير التجريبية)
            uniqueFinances.push(fin);
        } else {
            // للبيانات التجريبية، احتفظ بواحدة فقط من كل نوع
            const typeKey = `${fin.type}-${targetEmployeeId}`;
            if (!seenTypes.has(typeKey)) {
                seenTypes.add(typeKey);
                uniqueFinances.push(fin);
                console.log(`✅ تم الاحتفاظ بـ ${fin.type}: ${fin.reason}`);
            } else {
                console.log(`🗑️ تم حذف المكرر: ${fin.type} - ${fin.reason}`);
            }
        }
    });
    
    finances = uniqueFinances;
    saveData();
    
    const deletedCount = originalLength - finances.length;
    console.log(`🧹 تم حذف ${deletedCount} سجل مالي مكرر`);
    
    // تحديث البيان المالي إذا كان الموظف الحالي
    if (currentUser && currentUser.id === targetEmployeeId && currentUser.role === 'employee') {
        loadEmployeeFinancialReport();
    }
    
    return deletedCount;
}

// دالة إعادة تعيين البيانات المالية للموظف
function resetEmployeeFinancialData(employeeId = null) {
    const targetEmployeeId = employeeId || (currentUser ? currentUser.id : null);
    
    if (!targetEmployeeId) {
        console.error('❌ لا يوجد معرف موظف للإعادة تعيين');
        return;
    }
    
    const confirmReset = confirm('هل أنت متأكد من حذف جميع البيانات المالية التجريبية للموظف؟\n\nسيتم الاحتفاظ بالبيانات الحقيقية فقط.');
    
    if (!confirmReset) {
        console.log('🚫 تم إلغاء عملية الإعادة تعيين');
        return;
    }
    
    console.log('🔄 إعادة تعيين البيانات المالية للموظف:', targetEmployeeId);
    
    const originalLength = finances.length;
    
    // حذف جميع البيانات التجريبية والإجبارية
    finances = finances.filter(fin => {
        if (fin.employeeId !== targetEmployeeId) return true;
        
        const isTestData = fin.reason && (
            fin.reason.includes('تجريبية') ||
            fin.reason.includes('إجبارية') ||
            fin.reason.includes('للعرض') ||
            fin.id.includes('sample') ||
            fin.id.includes('forced') ||
            fin.id.includes('test')
        );
        
        return !isTestData; // الاحتفاظ بالبيانات الحقيقية فقط
    });
    
    saveData();
    
    const deletedCount = originalLength - finances.length;
    console.log(`✅ تم حذف ${deletedCount} سجل مالي تجريبي`);
    
    // تحديث البيان المالي
    if (currentUser && currentUser.id === targetEmployeeId && currentUser.role === 'employee') {
        loadEmployeeFinancialReport();
    }
    
    return deletedCount;
}

// دالة إزالة البيانات التجريبية فقط (بدون تأكيد)
function removeTestDataOnly(employeeId = null) {
    const targetEmployeeId = employeeId || (currentUser ? currentUser.id : null);
    
    if (!targetEmployeeId) {
        console.error('❌ لا يوجد معرف موظف');
        return;
    }
    
    console.log('🧹 إزالة البيانات التجريبية فقط للموظف:', targetEmployeeId);
    
    const originalLength = finances.length;
    
    // حذف البيانات التجريبية فقط
    finances = finances.filter(fin => {
        if (fin.employeeId !== targetEmployeeId) return true;
        
        const isTestData = fin.reason && (
            fin.reason.includes('تجريبية') ||
            fin.reason.includes('إجبارية') ||
            fin.reason.includes('للعرض') ||
            fin.reason.includes('محسنة') ||
            fin.reason.includes('محسن') ||
            fin.reason.includes('أولى') ||
            fin.reason.includes('أولي') ||
            fin.id.includes('sample') ||
            fin.id.includes('forced') ||
            fin.id.includes('test')
        );
        
        if (isTestData) {
            console.log(`🗑️ حذف البيانات التجريبية: ${fin.type} - ${fin.reason}`);
        }
        
        return !isTestData; // الاحتفاظ بالبيانات الحقيقية فقط
    });
    
    saveData();
    
    const deletedCount = originalLength - finances.length;
    console.log(`✅ تم إزالة ${deletedCount} سجل تجريبي - البيانات الحقيقية محفوظة`);
    
    // تحديث البيان المالي
    if (currentUser && currentUser.id === targetEmployeeId && currentUser.role === 'employee') {
        loadEmployeeFinancialReport();
        
        // إظهار رسالة نجاح
        showTemporaryMessage(`تم حذف ${deletedCount} سجل تجريبي - البيانات الحقيقية محفوظة`, 'success');
    }
    
    return deletedCount;
}

// دالة فحص نوع البيانات المالية
function analyzeFinancialData(employeeId = null) {
    const targetEmployeeId = employeeId || (currentUser ? currentUser.id : null);
    
    if (!targetEmployeeId) {
        console.error('❌ لا يوجد معرف موظف');
        return;
    }
    
    const employeeFinances = finances.filter(fin => fin.employeeId === targetEmployeeId);
    
    console.log('📊 تحليل البيانات المالية للموظف:');
    console.log(`📈 إجمالي العمليات المالية: ${employeeFinances.length}`);
    
    const realData = employeeFinances.filter(fin => {
        const isTestData = fin.reason && (
            fin.reason.includes('تجريبية') ||
            fin.reason.includes('إجبارية') ||
            fin.reason.includes('للعرض') ||
            fin.id.includes('sample') ||
            fin.id.includes('forced') ||
            fin.id.includes('test')
        );
        return !isTestData;
    });
    
    const testData = employeeFinances.filter(fin => {
        const isTestData = fin.reason && (
            fin.reason.includes('تجريبية') ||
            fin.reason.includes('إجبارية') ||
            fin.reason.includes('للعرض') ||
            fin.id.includes('sample') ||
            fin.id.includes('forced') ||
            fin.id.includes('test')
        );
        return isTestData;
    });
    
    console.log(`✅ البيانات الحقيقية: ${realData.length} عملية`);
    console.log(`🧪 البيانات التجريبية: ${testData.length} عملية`);
    
    if (realData.length > 0) {
        console.log('📋 البيانات الحقيقية:');
        realData.forEach(fin => console.log(`  - ${fin.type}: ${fin.amount} (${fin.reason})`));
    }
    
    if (testData.length > 0) {
        console.log('🧪 البيانات التجريبية:');
        testData.forEach(fin => console.log(`  - ${fin.type}: ${fin.amount} (${fin.reason})`));
    }
    
    return { realData, testData };
}

// دالة تقرير حالة النظام
function showSystemStatus() {
    if (!currentUser) {
        console.log('❌ لا يوجد مستخدم مسجل');
        return;
    }
    
    console.log('🔍 تقرير حالة النظام:');
    console.log('═══════════════════════════');
    console.log(`👤 المستخدم: ${currentUser.name} (${currentUser.role})`);
            console.log(`📅 التاريخ: ${formatDate(new Date())}`);
            console.log(`🕐 الوقت: ${new Date().toLocaleTimeString('ar-SA')}`);
    console.log('═══════════════════════════');
    
    if (currentUser.role === 'employee') {
        const analysis = analyzeFinancialData();
        
        console.log('📊 حالة البيانات المالية:');
        console.log(`✅ البيانات الحقيقية: ${analysis.realData.length} عملية`);
        console.log(`🧪 البيانات التجريبية: ${analysis.testData.length} عملية`);
        
        if (analysis.realData.length > 0) {
            console.log('🎯 توصية: النظام يعرض البيانات الحقيقية');
            console.log('💡 إذا كانت البيانات التجريبية تظهر، اضغط "حذف التجريبية"');
        } else if (analysis.testData.length > 0) {
            console.log('⚠️ تحذير: يتم عرض بيانات تجريبية فقط');
            console.log('💡 اطلب من المدير إضافة البيانات الحقيقية');
        } else {
            console.log('📋 حالة طبيعية: لا توجد بيانات مالية');
            console.log('💡 هذا يعني عدم وجود سلف أو خصومات');
        }
        
        console.log('───────────────────────────');
        console.log('📈 إحصائيات الحضور:');
        const attendanceRecords = attendance.filter(att => att.employeeId === currentUser.id);
        console.log(`📋 سجلات الحضور: ${attendanceRecords.length}`);
        
        // حساب ساعات العمل هذا الأسبوع
        const weekNumber = getWeekNumber(new Date());
        const weekAttendance = attendanceRecords.filter(att => {
            const recordDate = new Date(att.date);
            return getWeekNumber(recordDate) === weekNumber;
        });
        
        let totalHours = 0;
        weekAttendance.forEach(att => {
            if (att.checkIn && att.checkOut) {
                const duration = parseFloat(att.totalHours) || 0;
                totalHours += duration;
            }
        });
        
        console.log(`🕐 ساعات العمل هذا الأسبوع: ${totalHours.toFixed(2)} ساعة`);
        console.log(`💰 المستحق المتوقع: ${(totalHours * (currentUser.salary / 6 / 10.5)).toFixed(2)} ${getCurrencySymbol(currentUser.currency)}`);
        
    } else if (currentUser.role === 'admin') {
        console.log('👥 إحصائيات الموظفين:');
        const totalEmployees = employees.length;
        const activeEmployees = employees.filter(emp => emp.id !== 'admin').length;
        console.log(`📊 إجمالي الموظفين: ${totalEmployees}`);
        console.log(`✅ الموظفين النشطين: ${activeEmployees}`);
        
        console.log('───────────────────────────');
        console.log('📈 إحصائيات عامة:');
        console.log(`📋 إجمالي سجلات الحضور: ${attendance.length}`);
        console.log(`💰 إجمالي العمليات المالية: ${finances.length}`);
        
        // فحص البيانات التجريبية لجميع الموظفين
        const allTestData = finances.filter(fin => {
            const isTestData = fin.reason && (
                fin.reason.includes('تجريبية') ||
                fin.reason.includes('إجبارية') ||
                fin.reason.includes('للعرض') ||
                fin.id.includes('sample') ||
                fin.id.includes('forced') ||
                fin.id.includes('test')
            );
            return isTestData;
        });
        
        console.log(`🧪 البيانات التجريبية في النظام: ${allTestData.length}`);
        
        if (allTestData.length > 0) {
            console.log('⚠️ تحذير: يوجد بيانات تجريبية في النظام');
            console.log('💡 استخدم "حذف التجريبية" لكل موظف لتنظيف البيانات');
        }
    }
    
    console.log('═══════════════════════════');
    console.log('🔧 أدوات الإصلاح المتاحة:');
    console.log('• analyzeFinancialData() - تحليل البيانات المالية');
    console.log('• removeTestDataOnly() - حذف البيانات التجريبية');
    console.log('• forceFixFinancialDisplay() - إصلاح فوري');
    console.log('• showSystemStatus() - عرض هذا التقرير');
    console.log('═══════════════════════════');
}

// دالة عرض تنبيه البيانات التجريبية
function showTestDataWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #dc3545;
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
        text-align: center;
        animation: slideIn 0.3s ease-out;
    `;
    
    warningDiv.innerHTML = `
        <div style="margin-bottom: 10px;">⚠️ تحذير: بيانات تجريبية</div>
        <div style="font-size: 14px; margin-bottom: 10px;">
            البيان المالي يعرض بيانات تجريبية وليس الحقيقية
        </div>
        <button onclick="removeTestDataOnly(); this.parentElement.remove();" 
                style="background: white; color: #dc3545; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">
            🗑️ حذف التجريبية
        </button>
    `;
    
    document.body.appendChild(warningDiv);
    
    // إزالة التنبيه تلقائياً بعد 10 ثواني
    setTimeout(() => {
        if (warningDiv.parentElement) {
            warningDiv.remove();
        }
    }, 10000);
}

// دالة عرض تنبيه البيانات المختلطة
function showMixedDataWarning() {
    const warningDiv = document.createElement('div');
    warningDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: #ffc107;
        color: #333;
        padding: 15px 20px;
        border-radius: 8px;
        z-index: 1000;
        font-weight: bold;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 300px;
        text-align: center;
        animation: slideIn 0.3s ease-out;
    `;
    
    warningDiv.innerHTML = `
        <div style="margin-bottom: 10px;">⚠️ تنبيه: بيانات مختلطة</div>
        <div style="font-size: 14px; margin-bottom: 10px;">
            يوجد بيانات حقيقية وتجريبية معاً
        </div>
        <button onclick="removeTestDataOnly(); this.parentElement.remove();" 
                style="background: #333; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer; font-weight: bold;">
            🧹 حذف التجريبية فقط
        </button>
    `;
    
    document.body.appendChild(warningDiv);
    
    // إزالة التنبيه تلقائياً بعد 8 ثواني
    setTimeout(() => {
        if (warningDiv.parentElement) {
            warningDiv.remove();
        }
    }, 8000);
}

// دالة فحص نوع البيانات وإظهار التنبيهات
function checkDataTypeAndShowWarnings() {
    if (!currentUser || currentUser.role !== 'employee') {
        return;
    }
    
    // إزالة التنبيهات السابقة
    const existingWarnings = document.querySelectorAll('[style*="position: fixed"][style*="top: 20px"][style*="right: 20px"]');
    existingWarnings.forEach(warning => {
        if (warning.innerHTML.includes('تحذير') || warning.innerHTML.includes('تنبيه')) {
            warning.remove();
        }
    });
    
    // فحص البيانات
    const analysis = analyzeFinancialData();
    
    // إظهار التنبيه المناسب
    if (analysis.testData.length > 0 && analysis.realData.length === 0) {
        // بيانات تجريبية فقط
        setTimeout(() => showTestDataWarning(), 1000);
    } else if (analysis.testData.length > 0 && analysis.realData.length > 0) {
        // بيانات مختلطة
        setTimeout(() => showMixedDataWarning(), 1000);
    }
    
    // طباعة تقرير سريع في Console
    console.log('📊 حالة البيانات المالية:', {
        real: analysis.realData.length,
        test: analysis.testData.length,
        status: analysis.testData.length === 0 ? 'نظيف' : 
                analysis.realData.length === 0 ? 'تجريبي فقط' : 'مختلط'
    });
}

// دالة عرض جميع البيانات المالية للموظف
function showAllEmployeeFinancialData() {
    if (!currentUser || currentUser.role !== 'employee') {
        return;
    }
    
    console.log('📋 عرض جميع البيانات المالية للموظف:', currentUser.name);
    
    // الحصول على جميع البيانات المالية للموظف
    const allEmployeeFinances = finances.filter(fin => fin.employeeId === currentUser.id);
    const currencySymbol = getCurrencySymbol(currentUser.currency || 'SAR');
    
    console.log('📊 إجمالي البيانات المالية:', allEmployeeFinances.length);
    console.log('📊 تفاصيل البيانات:', allEmployeeFinances);
    
    // تحديث جدول العمليات المالية بجميع البيانات
    const tbody = document.getElementById('financialTransactionsTableBody');
    tbody.innerHTML = '';
    
    if (allEmployeeFinances.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #666;">لا توجد عمليات مالية</td></tr>';
        return;
    }
    
    // إضافة عنوان للتوضيح
    const headerRow = document.createElement('tr');
    headerRow.style.backgroundColor = '#e3f2fd';
    headerRow.innerHTML = `
        <td colspan="4" style="text-align: center; font-weight: bold; color: #1976d2; padding: 10px;">
            📋 جميع العمليات المالية (${allEmployeeFinances.length} عملية)
            <button onclick="loadEmployeeFinancialReport()" 
                    style="background: #28a745; color: white; border: none; padding: 4px 8px; border-radius: 3px; margin-right: 10px; cursor: pointer; font-size: 12px;">
                🔄 العودة للأسبوع الحالي
            </button>
        </td>
    `;
    tbody.appendChild(headerRow);
    
    // ترتيب البيانات حسب التاريخ (الأحدث أولاً)
    allEmployeeFinances.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    allEmployeeFinances.forEach(fin => {
        const row = document.createElement('tr');
        
        // تحديد نوع العملية ولونها
        let typeText, typeColor;
        if (fin.type === 'deduction') {
            typeText = 'خصم';
            typeColor = '#dc3545';
        } else if (fin.type === 'advance') {
            typeText = 'سلفة';
            typeColor = '#007bff';
        } else if (fin.type === 'payment') {
            typeText = 'تسليم راتب';
            typeColor = '#28a745';
        } else {
            typeText = fin.type;
            typeColor = '#6c757d';
        }
        
        // تحديد إذا كانت العملية تجريبية
        const isTestData = fin.reason && (
            fin.reason.includes('تجريبية') ||
            fin.reason.includes('إجبارية') ||
            fin.reason.includes('للعرض') ||
            fin.id.includes('sample') ||
            fin.id.includes('forced') ||
            fin.id.includes('test')
        );
        
        // إضافة تمييز للبيانات التجريبية
        if (isTestData) {
            row.style.backgroundColor = '#fff3cd';
            row.style.border = '1px solid #ffc107';
        }
        
        row.innerHTML = `
            <td>
                ${formatDate(fin.date)}
                ${isTestData ? '<br><small style="color: #856404;">🧪 تجريبي</small>' : ''}
            </td>
            <td><span style="color: ${typeColor}; font-weight: bold;">${typeText}</span></td>
            <td>${fin.amount.toFixed(2)} ${currencySymbol}</td>
            <td>
                ${fin.reason}
                ${isTestData ? '<br><small><em>⚠️ بيانات تجريبية - استخدم "حذف التجريبية" لإزالتها</em></small>' : ''}
            </td>
        `;
        
        tbody.appendChild(row);
    });
    
    // تحديث عنوان القسم
    const financialSection = document.querySelector('.financial-transactions h4');
    if (financialSection) {
        financialSection.innerHTML = `💼 جميع العمليات المالية (${allEmployeeFinances.length} عملية)`;
    }
    
    console.log('✅ تم عرض جميع البيانات المالية للموظف');
    
    // إظهار رسالة توضيحية
    showTemporaryMessage(`تم عرض جميع البيانات المالية (${allEmployeeFinances.length} عملية)`, 'info');
}

// دالة تشخيص وإصلاح مشكلة التواريخ
function diagnoseDateIssues() {
    if (!currentUser || currentUser.role !== 'employee') {
        console.error('❌ يجب تسجيل الدخول كموظف');
        return;
    }
    
    const allEmployeeFinances = finances.filter(fin => fin.employeeId === currentUser.id);
    
    console.log('🔍 تشخيص مشكلة التواريخ:');
    console.log('═══════════════════════════');
    console.log(`📊 إجمالي البيانات المالية للموظف: ${allEmployeeFinances.length}`);
    
    if (allEmployeeFinances.length === 0) {
        console.log('❌ لا توجد بيانات مالية للموظف');
        return;
    }
    
    // فحص تنسيق التواريخ
    console.log('📅 فحص تنسيق التواريخ:');
    allEmployeeFinances.forEach((fin, index) => {
        console.log(`${index + 1}. ID: ${fin.id}`);
        console.log(`   التاريخ الأصلي: "${fin.date}"`);
        console.log(`   النوع: ${fin.type}`);
        console.log(`   المبلغ: ${fin.amount}`);
        console.log(`   السبب: ${fin.reason}`);
        
        // محاولة تحويل التاريخ
        const finDate = new Date(fin.date);
        if (isNaN(finDate.getTime())) {
            console.log(`   ❌ تاريخ غير صحيح - محاولة التحويل اليدوي...`);
            
            // محاولة تحويل DD/MM/YYYY
            const [day, month, year] = fin.date.split('/');
            if (day && month && year) {
                const correctedDate = new Date(year, month - 1, day);
                console.log(`   🔧 التاريخ المصحح: ${formatDate(correctedDate)}`);
                console.log(`   📅 التاريخ بتنسيق ISO: ${correctedDate.toISOString().split('T')[0]}`);
            }
        } else {
            console.log(`   ✅ التاريخ صحيح: ${formatDate(finDate)}`);
        }
        console.log('   ───────────────────');
    });
    
    // فحص الأسبوع الحالي
    const weekSelect = document.getElementById('employeeWeekSelect');
    const selectedWeek = weekSelect.value;
    const [year, weekNum] = selectedWeek.split('-W');
    const startDate = getDateOfWeek(year, weekNum);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    console.log('📅 فترة الأسبوع المحدد:');
    console.log(`   من: ${formatDate(startDate)} (${startDate.toISOString().split('T')[0]})`);
    console.log(`   إلى: ${formatDate(endDate)} (${endDate.toISOString().split('T')[0]})`);
    
    // فحص أي البيانات تقع ضمن الفترة
    console.log('🎯 البيانات ضمن فترة الأسبوع المحدد:');
    let matchingCount = 0;
    
    allEmployeeFinances.forEach((fin, index) => {
        const finDate = new Date(fin.date);
        let isInRange = false;
        
        if (!isNaN(finDate.getTime())) {
            isInRange = finDate >= startDate && finDate <= endDate;
        } else {
            // محاولة التحويل اليدوي
            const [day, month, year] = fin.date.split('/');
            if (day && month && year) {
                const correctedDate = new Date(year, month - 1, day);
                isInRange = correctedDate >= startDate && correctedDate <= endDate;
            }
        }
        
        if (isInRange) {
            matchingCount++;
            console.log(`   ✅ البيان ${index + 1}: ${fin.reason} - ${fin.amount}`);
        }
    });
    
    console.log(`📊 النتيجة: ${matchingCount} من ${allEmployeeFinances.length} عملية تقع في الأسبوع المحدد`);
    
    if (matchingCount === 0 && allEmployeeFinances.length > 0) {
        console.log('💡 الحل المقترح: استخدم showAllEmployeeFinancialData() لعرض جميع البيانات');
        console.log('أو غير الأسبوع المحدد لأسبوع يحتوي على العمليات المالية');
    }
    
    return {
        totalFinances: allEmployeeFinances.length,
        weekMatches: matchingCount,
        allFinances: allEmployeeFinances
    };
}

// دالة إصلاح تواريخ المعاملات المالية (إصلاح مشكلة DD-MM-YYYY)
function fixFinancialDatesFormat() {
    console.log('🔧 بدء إصلاح تنسيق تواريخ المعاملات المالية...');
    console.log('🎯 المشكلة: التواريخ محفوظة بتنسيق DD-MM-YYYY بدلاً من ISO format');
    
    let fixedCount = 0;
    
    finances.forEach((fin, index) => {
        console.log(`🔍 فحص العملية ${index + 1}: ${fin.reason}`);
        console.log(`   التاريخ الأصلي: "${fin.date}"`);
        
        // فحص إذا كان التاريخ بتنسيق DD-MM-YYYY (مثل 06-07-2025)
        const ddmmyyyyPattern = /^(\d{2})-(\d{2})-(\d{4})$/;
        const match = fin.date.match(ddmmyyyyPattern);
        
        if (match) {
            const [, day, month, year] = match;
            console.log(`   🔍 تم اكتشاف تنسيق DD-MM-YYYY: يوم=${day}, شهر=${month}, سنة=${year}`);
            
            // تحويل إلى ISO format (YYYY-MM-DD)
            const isoDate = `${year}-${month}-${day}`;
            console.log(`   🔧 التحويل إلى ISO: ${fin.date} → ${isoDate}`);
            
            // التحقق من صحة التاريخ
            const testDate = new Date(isoDate);
            if (!isNaN(testDate.getTime())) {
                // تحديث التاريخ في البيانات
                const finIndex = finances.findIndex(f => f.id === fin.id);
                if (finIndex !== -1) {
                    finances[finIndex].date = isoDate;
                    fixedCount++;
                    console.log(`   ✅ تم الإصلاح: ${formatDate(testDate)}`);
                }
            } else {
                console.log(`   ❌ التاريخ غير صحيح بعد التحويل: ${isoDate}`);
            }
        } else {
            // فحص إذا كان التاريخ ISO بالفعل
            const testDate = new Date(fin.date);
            if (!isNaN(testDate.getTime())) {
                console.log(`   ✅ التاريخ صحيح بالفعل (ISO): ${formatDate(testDate)}`);
            } else {
                console.log(`   ⚠️ تنسيق تاريخ غير مدعوم: ${fin.date}`);
                
                // محاولة إصلاح تنسيقات أخرى (DD/MM/YYYY)
                const dateParts = fin.date.split(/[-\/]/);
                if (dateParts.length === 3) {
                    const [day, month, year] = dateParts;
                    if (day && month && year && year.length === 4) {
                        const correctedDate = new Date(year, month - 1, day);
                        if (!isNaN(correctedDate.getTime())) {
                            const isoDate = correctedDate.toISOString().split('T')[0];
                            console.log(`   🔧 تم الإصلاح (تنسيق مختلط): ${fin.date} → ${isoDate}`);
                            
                            // تحديث التاريخ في البيانات
                            const finIndex = finances.findIndex(f => f.id === fin.id);
                            if (finIndex !== -1) {
                                finances[finIndex].date = isoDate;
                                fixedCount++;
                            }
                        }
                    }
                }
            }
        }
    });
    
    if (fixedCount > 0) {
        saveData();
        console.log(`✅ تم إصلاح ${fixedCount} تاريخ من أصل ${finances.length}`);
        console.log('🔄 إعادة تحميل البيان المالي...');
        
        // إعادة تحميل البيان المالي
        setTimeout(() => {
            if (currentUser && currentUser.role === 'employee') {
                loadEmployeeFinancialReport();
            }
            if (typeof loadFinancesList === 'function') {
                loadFinancesList();
            }
        }, 500);
        
        showTemporaryMessage(`تم إصلاح ${fixedCount} تاريخ - تحقق من البيان المالي الآن`, 'success');
    } else {
        console.log('✅ جميع التواريخ صحيحة - لا حاجة للإصلاح');
        showTemporaryMessage('جميع التواريخ صحيحة', 'info');
    }
    
    return fixedCount;
}

// تصدير الدوال للاستخدام العام
window.testFunctions = {
    addTestFinancialData,
    showEmployeeFinances,
    clearTestFinancialData,
    refreshEmployeeFinancialReport,
    printDiagnosticInfo,
    forceFixFinancialDisplay,
    forcedAddFinancialData,
    forceUpdateFinancialSummary,
    cleanDuplicateFinancialData,
    resetEmployeeFinancialData,
    removeTestDataOnly,
    analyzeFinancialData,
    showSystemStatus,
    showTestDataWarning,
    showMixedDataWarning,
    checkDataTypeAndShowWarnings,
    showAllEmployeeFinancialData,
    diagnoseDateIssues,
    fixFinancialDatesFormat
};

// دالة إصلاح تواريخ سجلات الحضور (نفس مبدأ إصلاح التواريخ المالية)
function fixAttendanceDatesFormat() {
    console.log('🔧 بدء إصلاح تنسيق تواريخ سجلات الحضور...');
    console.log('🎯 المشكلة: التواريخ محفوظة بتنسيق DD-MM-YYYY بدلاً من ISO format');
    
    let fixedCount = 0;
    
    attendance.forEach((att, index) => {
        console.log(`🔍 فحص سجل الحضور ${index + 1}: ${att.employeeName} - ${att.date}`);
        console.log(`   التاريخ الأصلي: "${att.date}"`);
        
        // فحص إذا كان التاريخ بتنسيق DD-MM-YYYY (مثل 06-07-2025)
        const ddmmyyyyPattern = /^(\d{2})-(\d{2})-(\d{4})$/;
        const match = att.date.match(ddmmyyyyPattern);
        
        if (match) {
            const [, day, month, year] = match;
            console.log(`   🔍 تم اكتشاف تنسيق DD-MM-YYYY: يوم=${day}, شهر=${month}, سنة=${year}`);
            
            // تحويل إلى ISO format (YYYY-MM-DD)
            const isoDate = `${year}-${month}-${day}`;
            console.log(`   🔧 التحويل إلى ISO: ${att.date} → ${isoDate}`);
            
            // التحقق من صحة التاريخ
            const testDate = new Date(isoDate);
            if (!isNaN(testDate.getTime())) {
                // تحديث التاريخ في البيانات
                const attIndex = attendance.findIndex(a => a.id === att.id);
                if (attIndex !== -1) {
                    attendance[attIndex].date = isoDate;
                    fixedCount++;
                    console.log(`   ✅ تم الإصلاح: ${formatDate(testDate)}`);
                }
            } else {
                console.log(`   ❌ التاريخ غير صحيح بعد التحويل: ${isoDate}`);
            }
        } else {
            // فحص إذا كان التاريخ ISO بالفعل
            const testDate = new Date(att.date);
            if (!isNaN(testDate.getTime())) {
                console.log(`   ✅ التاريخ صحيح بالفعل (ISO): ${formatDate(testDate)}`);
            } else {
                console.log(`   ⚠️ تنسيق تاريخ غير مدعوم: ${att.date}`);
                
                // محاولة إصلاح تنسيقات أخرى (DD/MM/YYYY)
                const dateParts = att.date.split(/[-\/]/);
                if (dateParts.length === 3) {
                    const [day, month, year] = dateParts;
                    if (day && month && year && year.length === 4) {
                        const correctedDate = new Date(year, month - 1, day);
                        if (!isNaN(correctedDate.getTime())) {
                            const isoDate = correctedDate.toISOString().split('T')[0];
                            console.log(`   🔧 تم الإصلاح (تنسيق مختلط): ${att.date} → ${isoDate}`);
                            
                            // تحديث التاريخ في البيانات
                            const attIndex = attendance.findIndex(a => a.id === att.id);
                            if (attIndex !== -1) {
                                attendance[attIndex].date = isoDate;
                                fixedCount++;
                            }
                        }
                    }
                }
            }
        }
    });
    
    if (fixedCount > 0) {
        saveData();
        console.log(`✅ تم إصلاح ${fixedCount} تاريخ حضور من أصل ${attendance.length}`);
        console.log('🔄 إعادة تحميل سجل الحضور...');
        
        // إعادة تحميل سجل الحضور
        setTimeout(() => {
            if (currentUser && currentUser.role === 'employee') {
                loadEmployeeAttendance();
                updateTodayStatus();
            }
            if (currentUser && currentUser.role === 'manager') {
                generateWeeklyReport();
            }
        }, 500);
        
        showTemporaryMessage(`تم إصلاح ${fixedCount} تاريخ حضور - تحقق من السجلات الآن`, 'success');
    } else {
        console.log('✅ جميع تواريخ الحضور صحيحة - لا حاجة للإصلاح');
        showTemporaryMessage('جميع تواريخ الحضور صحيحة', 'info');
    }
    
    return fixedCount;
}

// دالة شاملة لإصلاح جميع التواريخ في النظام
function fixAllDatesFormat() {
    console.log('🚀 بدء إصلاح شامل لجميع التواريخ في النظام...');
    
    let totalFixed = 0;
    
    // إصلاح تواريخ العمليات المالية
    console.log('💰 إصلاح تواريخ العمليات المالية...');
    const financesFixed = fixFinancialDatesFormat();
    totalFixed += financesFixed;
    
    // إصلاح تواريخ سجلات الحضور
    console.log('📋 إصلاح تواريخ سجلات الحضور...');
    const attendanceFixed = fixAttendanceDatesFormat();
    totalFixed += attendanceFixed;
    
    if (totalFixed > 0) {
        console.log(`🎉 تم الإصلاح الشامل بنجاح: ${totalFixed} تاريخ`);
        showTemporaryMessage(`تم إصلاح ${totalFixed} تاريخ في النظام بالكامل`, 'success');
    } else {
        console.log('✅ جميع التواريخ في النظام صحيحة');
        showTemporaryMessage('جميع التواريخ في النظام صحيحة', 'info');
    }
    
    return totalFixed;
}

// دالة إصلاح مشكلة timezone في سجلات الحضور الموجودة
function fixTimezoneIssuesInAttendance() {
    console.log('🌍 بدء إصلاح مشكلة timezone في سجلات الحضور...');
    console.log('🎯 المشكلة: سجلات محفوظة بـ UTC بدلاً من التوقيت المحلي');
    
    const today = getLocalDateISO();
    console.log(`📅 التاريخ المحلي اليوم: ${today}`);
    
    let fixedCount = 0;
    const currentTimezoneOffset = new Date().getTimezoneOffset(); // بالدقائق
    console.log(`🕐 فرق التوقيت المحلي: ${-currentTimezoneOffset / 60} ساعات من UTC`);
    
    attendance.forEach((att, index) => {
        console.log(`🔍 فحص سجل الحضور ${index + 1}: ${att.employeeName} - ${att.date}`);
        
        // تحويل التاريخ المحفوظ إلى Date object
        const savedDate = new Date(att.date + 'T00:00:00.000Z'); // افتراض أنه UTC
        const localDate = new Date(savedDate.getTime() - (currentTimezoneOffset * 60 * 1000));
        const correctedLocalDate = getLocalDateISO(localDate);
        
        console.log(`   التاريخ الأصلي: ${att.date}`);
        console.log(`   التاريخ المصحح: ${correctedLocalDate}`);
        
        // إذا كان هناك فرق، قم بالإصلاح
        if (att.date !== correctedLocalDate) {
            console.log(`   🔧 تصحيح التاريخ: ${att.date} → ${correctedLocalDate}`);
            
            // تحديث التاريخ في البيانات
            const attIndex = attendance.findIndex(a => a.id === att.id);
            if (attIndex !== -1) {
                attendance[attIndex].date = correctedLocalDate;
                fixedCount++;
                console.log(`   ✅ تم الإصلاح`);
            }
        } else {
            console.log(`   ✅ التاريخ صحيح بالفعل`);
        }
    });
    
    if (fixedCount > 0) {
        saveData();
        console.log(`✅ تم إصلاح ${fixedCount} تاريخ حضور من أصل ${attendance.length}`);
        console.log('🔄 إعادة تحميل سجل الحضور...');
        
        // إعادة تحميل سجل الحضور
        setTimeout(() => {
            if (currentUser && currentUser.role === 'employee') {
                loadEmployeeAttendance();
                updateTodayStatus();
            }
            if (currentUser && currentUser.role === 'manager') {
                generateWeeklyReport();
            }
        }, 500);
        
        showTemporaryMessage(`تم إصلاح ${fixedCount} تاريخ من مشكلة timezone`, 'success');
    } else {
        console.log('✅ جميع تواريخ الحضور صحيحة - لا حاجة للإصلاح');
        showTemporaryMessage('جميع تواريخ الحضور محلية وصحيحة', 'info');
    }
    
    return fixedCount;
}

// دالة شاملة جديدة لإصلاح جميع مشاكل التواريخ
function fixAllDateIssues() {
    console.log('🚀 بدء إصلاح شامل لجميع مشاكل التواريخ في النظام...');
    
    let totalFixed = 0;
    
    // إصلاح تواريخ العمليات المالية (DD-MM-YYYY → ISO)
    console.log('💰 إصلاح تنسيق تواريخ العمليات المالية...');
    const financesFixed = fixFinancialDatesFormat();
    totalFixed += financesFixed;
    
    // إصلاح تواريخ سجلات الحضور (DD-MM-YYYY → ISO)
    console.log('📋 إصلاح تنسيق تواريخ سجلات الحضور...');
    const attendanceFormatFixed = fixAttendanceDatesFormat();
    totalFixed += attendanceFormatFixed;
    
    // إصلاح مشكلة timezone في سجلات الحضور
    console.log('🌍 إصلاح مشكلة timezone في سجلات الحضور...');
    const timezoneFixed = fixTimezoneIssuesInAttendance();
    totalFixed += timezoneFixed;
    
    if (totalFixed > 0) {
        console.log(`🎉 تم الإصلاح الشامل بنجاح: ${totalFixed} تاريخ`);
        showTemporaryMessage(`تم إصلاح ${totalFixed} تاريخ - جميع مشاكل التواريخ تم حلها`, 'success');
    } else {
        console.log('✅ جميع التواريخ في النظام صحيحة');
        showTemporaryMessage('جميع التواريخ في النظام صحيحة ومحلية', 'info');
    }
    
    return totalFixed;
}

// تصدير دوال التاريخ الموحدة للاستخدام العام
window.formatDate = formatDate;
window.formatDateTime = formatDateTime;
window.getLocalDateISO = getLocalDateISO;
window.fixAttendanceDatesFormat = fixAttendanceDatesFormat;
window.fixAllDatesFormat = fixAllDatesFormat;
window.fixTimezoneIssuesInAttendance = fixTimezoneIssuesInAttendance;
window.fixAllDateIssues = fixAllDateIssues;
 
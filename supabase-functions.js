// ===== دوال Supabase للواجهة =====

// حفظ إعدادات Supabase
function saveSupabaseConfig() {
    const url = document.getElementById('supabaseUrl').value.trim();
    const key = document.getElementById('supabaseKey').value.trim();
    
    if (!url || !key) {
        alert('⚠️ يرجى إدخال Project URL و Anon Key');
        return;
    }
    
    if (!url.includes('supabase.co')) {
        alert('⚠️ Project URL غير صحيح. يجب أن يكون مثل: https://your-project.supabase.co');
        return;
    }
    
    // تحديث الإعدادات
    SUPABASE_CONFIG.url = url;
    SUPABASE_CONFIG.anonKey = key;
    
    // حفظ في localStorage
    localStorage.setItem('supabase_url', url);
    localStorage.setItem('supabase_key', key);
    
    alert('✅ تم حفظ الإعدادات بنجاح');
    
    // إعادة تهيئة المدير
    if (typeof supabaseManager !== 'undefined') {
        supabaseManager.init();
    }
}

// اختبار اتصال Supabase
async function testSupabaseConnection() {
    if (!supabaseManager.validateConfig()) {
        alert('⚠️ يرجى حفظ الإعدادات أولاً');
        return;
    }
    
    updateSupabaseStatus('جاري اختبار الاتصال...', 'info');
    
    try {
        const success = await supabaseManager.testConnection();
        
        if (success) {
            updateSupabaseStatus('✅ متصل مع Supabase بنجاح', 'success');
            alert('🎉 ممتاز! الاتصال مع Supabase يعمل بنجاح!');
        } else {
            updateSupabaseStatus('❌ فشل الاتصال مع Supabase', 'error');
            alert('❌ فشل الاتصال. تحقق من الإعدادات.');
        }
    } catch (error) {
        updateSupabaseStatus('❌ خطأ في الاتصال', 'error');
        alert('❌ خطأ في الاتصال: ' + error.message);
    }
}

// إعداد جداول Supabase
async function setupSupabaseTables() {
    if (!supabaseManager.validateConfig()) {
        alert('⚠️ يرجى حفظ الإعدادات واختبار الاتصال أولاً');
        return;
    }
    
    if (!confirm('هل تريد إعداد جداول قاعدة البيانات؟\n\nسيتم إنشاء 4 جداول: employees, attendance, branches, finances')) {
        return;
    }
    
    updateSupabaseStatus('جاري إعداد الجداول...', 'info');
    
    try {
        const success = await supabaseManager.setupTables();
        
        if (success) {
            updateSupabaseStatus('✅ تم إعداد جميع الجداول بنجاح', 'success');
            alert('🎉 ممتاز! تم إعداد قاعدة البيانات بنجاح!\n\nالنظام جاهز للاستخدام الآن!');
        } else {
            updateSupabaseStatus('❌ فشل في إعداد الجداول', 'error');
            alert('❌ فشل في إعداد الجداول. تحقق من الإعدادات.');
        }
    } catch (error) {
        updateSupabaseStatus('❌ خطأ في إعداد الجداول', 'error');
        alert('❌ خطأ في إعداد الجداول: ' + error.message);
    }
}

// نقل البيانات من النظام القديم
async function migrateData() {
    if (!supabaseManager.validateConfig()) {
        alert('⚠️ يرجى إعداد Supabase أولاً');
        return;
    }
    
    // التحقق من وجود بيانات محلية
    const localEmployees = JSON.parse(localStorage.getItem('employees')) || [];
    const localAttendance = JSON.parse(localStorage.getItem('attendance')) || [];
    const localBranches = JSON.parse(localStorage.getItem('branches')) || [];
    const localFinances = JSON.parse(localStorage.getItem('finances')) || [];
    
    const totalItems = localEmployees.length + localAttendance.length + localBranches.length + localFinances.length;
    
    if (totalItems === 0) {
        alert('ℹ️ لا توجد بيانات محلية لنقلها');
        return;
    }
    
    if (!confirm(`هل تريد نقل البيانات الموجودة إلى Supabase؟\n\nسيتم نقل:\n- ${localEmployees.length} موظف\n- ${localAttendance.length} سجل حضور\n- ${localBranches.length} فرع\n- ${localFinances.length} عملية مالية`)) {
        return;
    }
    
    updateSupabaseStatus('جاري نقل البيانات...', 'info');
    
    try {
        await supabaseManager.migrateFromLocalStorage();
        alert('✅ تم نقل جميع البيانات بنجاح!');
    } catch (error) {
        alert('❌ خطأ في نقل البيانات: ' + error.message);
    }
}

// مسح البيانات المحلية
function clearLocalData() {
    if (!confirm('هل تريد مسح جميع البيانات المحلية؟\n\n⚠️ تحذير: هذا سيحذف جميع البيانات المحفوظة محلياً!')) {
        return;
    }
    
    localStorage.removeItem('employees');
    localStorage.removeItem('attendance');
    localStorage.removeItem('branches');
    localStorage.removeItem('finances');
    localStorage.removeItem('currentUser');
    
    alert('✅ تم مسح جميع البيانات المحلية');
    
    // إعادة تحميل الصفحة
    if (confirm('هل تريد إعادة تحميل الصفحة؟')) {
        location.reload();
    }
}

// تنظيف البيانات المحلية من timestamp IDs
function cleanLocalDataManual() {
    if (!confirm('هل تريد تنظيف البيانات المحلية من IDs غير صحيحة؟\n\nهذا سيحذف أي بيانات بـ timestamp IDs وإصلاح البيانات المتضررة.')) {
        return;
    }
    
    if (typeof cleanLocalData === 'function') {
        // عد البيانات قبل التنظيف
        const beforeEmployees = employees.length;
        const beforeAttendance = attendance.length;
        const beforeFinances = finances.length;
        
        cleanLocalData();
        
        // عد البيانات بعد التنظيف
        const afterEmployees = employees.length;
        const afterAttendance = attendance.length;
        const afterFinances = finances.length;
        
        // عرض نتائج التنظيف
        const deletedEmployees = beforeEmployees - afterEmployees;
        const deletedAttendance = beforeAttendance - afterAttendance;
        const deletedFinances = beforeFinances - afterFinances;
        
        const totalDeleted = deletedEmployees + deletedAttendance + deletedFinances;
        
        if (totalDeleted > 0) {
            alert(`✅ تم تنظيف البيانات المحلية بنجاح!\n\n📊 تم حذف:\n- ${deletedEmployees} موظف\n- ${deletedAttendance} سجل حضور\n- ${deletedFinances} عملية مالية\n\n💡 تحقق من Console للمزيد من التفاصيل`);
        } else {
            alert('✅ البيانات المحلية نظيفة بالفعل!\n\nلم يتم العثور على أي IDs غير صحيحة.');
        }
        
        // إعادة تحميل قوائم البيانات
        if (typeof loadEmployeesList === 'function') loadEmployeesList();
        if (typeof loadBranchesList === 'function') loadBranchesList();
        if (typeof loadFinancesList === 'function') loadFinancesList();
        if (typeof loadBranchesSelect === 'function') loadBranchesSelect();
        if (typeof loadFinanceEmployeeSelect === 'function') loadFinanceEmployeeSelect();
    } else {
        alert('❌ دالة التنظيف غير متاحة');
    }
}

// نسخ كود SQL
function copySQLCode() {
    const sqlCode = document.getElementById('sqlCode').textContent;
    
    navigator.clipboard.writeText(sqlCode).then(() => {
        alert('✅ تم نسخ كود SQL!\n\nالآن:\n1. اذهب إلى Supabase Dashboard\n2. افتح SQL Editor\n3. الصق الكود وأجره');
    }).catch(() => {
        // طريقة بديلة للنسخ
        const textArea = document.createElement('textarea');
        textArea.value = sqlCode;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        alert('✅ تم نسخ كود SQL!');
    });
}

// تحديث حالة Supabase في الواجهة
function updateSupabaseStatus(message, type = 'info') {
    const statusElements = {
        connection: document.getElementById('supabaseConnectionStatus'),
        database: document.getElementById('supabaseDatabaseStatus'),
        tables: document.getElementById('supabaseTablesStatus')
    };
    
    // تحديث حالة الاتصال
    if (statusElements.connection) {
        statusElements.connection.textContent = message;
        statusElements.connection.style.color = getStatusColor(type);
    }
    
    // تحديث حالة قاعدة البيانات
    if (statusElements.database) {
        if (type === 'success') {
            statusElements.database.textContent = '✅ متصل';
            statusElements.database.style.color = '#28a745';
        } else if (type === 'error') {
            statusElements.database.textContent = '❌ غير متصل';
            statusElements.database.style.color = '#dc3545';
        }
    }
    
    // تحديث حالة الجداول
    if (statusElements.tables) {
        if (type === 'success') {
            statusElements.tables.textContent = '✅ جاهزة';
            statusElements.tables.style.color = '#28a745';
        } else if (type === 'error') {
            statusElements.tables.textContent = '❌ غير جاهزة';
            statusElements.tables.style.color = '#dc3545';
        }
    }
}

// الحصول على لون الحالة
function getStatusColor(type) {
    const colors = {
        success: '#28a745',
        error: '#dc3545',
        warning: '#ffc107',
        info: '#17a2b8'
    };
    return colors[type] || colors.info;
}

// تحميل الإعدادات المحفوظة عند تحميل الصفحة
document.addEventListener('DOMContentLoaded', function() {
    const savedUrl = localStorage.getItem('supabase_url');
    const savedKey = localStorage.getItem('supabase_key');
    
    if (savedUrl && savedKey) {
        // تحديث الإعدادات
        SUPABASE_CONFIG.url = savedUrl;
        SUPABASE_CONFIG.anonKey = savedKey;
        
        // تحديث حقول الإدخال
        const urlInput = document.getElementById('supabaseUrl');
        const keyInput = document.getElementById('supabaseKey');
        
        if (urlInput) urlInput.value = savedUrl;
        if (keyInput) keyInput.value = savedKey;
        
        // اختبار الاتصال تلقائياً
        setTimeout(() => {
            if (supabaseManager.validateConfig()) {
                testSupabaseConnection();
            }
        }, 2000);
    }
});

// تفعيل Supabase كقاعدة البيانات
function switchToSupabase() {
    if (!confirm('هل تريد تفعيل Supabase كقاعدة البيانات؟')) {
        return;
    }
    
    // حفظ إعداد التفعيل
    localStorage.setItem('use_supabase', 'true');
    
    alert('✅ تم تفعيل Supabase!\n\nسيتم إعادة تحميل الصفحة.');
    
    // إعادة تحميل الصفحة
    location.reload();
} 
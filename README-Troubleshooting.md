# 🔧 دليل حل المشاكل التقنية - مجموعة الشهباء التجارية

## 🚨 المشاكل الشائعة والحلول

### 1. ❌ خطأ 400 في حفظ العمليات المالية

**الأعراض:**
```javascript
Failed to load resource: the server responded with a status of 400
```

**السبب:** مشكلة في أسماء الأعمدة أو البيانات المرسلة لـ Supabase

**الحل المطبق:**
```javascript
// ✅ تنظيف البيانات قبل الإرسال
const financeData = {
    employee_id: finance.employeeId,
    employee_name: finance.employeeName,
    type: finance.type,
    amount: parseFloat(finance.amount),
    reason: finance.reason,
    date: finance.date
};

// إضافة week_paid فقط للمدفوعات
if (finance.type === 'payment' && finance.weekPaid) {
    financeData.week_paid = finance.weekPaid;
}
```

---

### 2. ❌ خطأ 406 في تسجيل الدخول

**الأعراض:**
```javascript
Failed to load resource: the server responded with a status of 406
```

**السبب:** مشاكل في headers أو تنسيق الطلب

**الحل المطبق:**
```javascript
// ✅ تحسين طلب تسجيل الدخول
const { data: employees, error } = await supabaseManager.supabase
    .from('employees')
    .select('id, name, username, position, salary, currency, branch_id, role')
    .eq('username', username.toString())
    .eq('password', password.toString())
    .single();

// معالجة أفضل للأخطاء
if (error && error.code === 'PGRST116') {
    console.log('❌ لم يتم العثور على المستخدم في Supabase');
    return null;
}
```

---

### 3. 🧹 مشكلة IDs المؤقتة غير الصحيحة

**الأعراض:**
```javascript
🧹 تم حذف ID غير صحيح: temp_1751793573499_sk6bsyu4m
```

**السبب:** إنشاء معرفات مؤقتة قد تتعارض مع Supabase

**الحل المطبق:**
```javascript
// ✅ إنشاء معرفات محلية آمنة
function generateTempId() {
    const timestamp = Date.now();
    const random1 = Math.random().toString(36).substring(2, 8);
    const random2 = Math.random().toString(36).substring(2, 8);
    const tempId = `local_${timestamp}_${random1}${random2}`;
    
    console.log('🆔 تم إنشاء معرف محلي:', tempId);
    return tempId;
}

// تنظيف IDs قبل الإرسال لـ Supabase
function cleanDataForSupabase(data, type) {
    if (cleanedData.id && (!isValidSupabaseId(cleanedData.id) || 
        cleanedData.id.includes('temp_') || 
        cleanedData.id.includes('local_'))) {
        console.log(`🧹 تم حذف ID مؤقت/محلي: ${data.id}`);
        delete cleanedData.id;
    }
}
```

---

## 🔍 أدوات التشخيص

### 1. فحص حالة النظام
```javascript
// في console المتصفح
console.log('📊 حالة النظام:', {
    employees: employees.length,
    attendance: attendance.length,
    finances: finances.length,
    branches: branches.length,
    currentUser: currentUser?.name,
    database: getActiveDatabase()
});
```

### 2. اختبار الاتصال بـ Supabase
```javascript
// في console المتصفح
await testDatabaseConnection();
```

### 3. تنظيف البيانات المحلية
```javascript
// في console المتصفح
cleanLocalData();
```

---

## 🛠️ عمليات الصيانة

### 1. تحديث قاعدة البيانات للنظام الجديد

**للمستخدمين الحاليين:**
```sql
-- إضافة دعم تسليم الرواتب
ALTER TABLE finances ADD COLUMN week_paid TEXT;
ALTER TABLE finances DROP CONSTRAINT IF EXISTS finances_type_check;
ALTER TABLE finances ADD CONSTRAINT finances_type_check 
CHECK (type IN ('deduction', 'advance', 'payment'));

-- إضافة دعم شبكات WiFi
ALTER TABLE branches ADD COLUMN wifi_networks TEXT[];
```

### 2. تنظيف البيانات التالفة
```sql
-- حذف العمليات المالية بـ employee_id غير صحيح
DELETE FROM finances WHERE employee_id ~ '^\d{13,}$';

-- حذف سجلات الحضور بـ employee_id غير صحيح  
DELETE FROM attendance WHERE employee_id ~ '^\d{13,}$';

-- تنظيف branch_id غير صحيح من الموظفين
UPDATE employees SET branch_id = NULL WHERE branch_id ~ '^\d{13,}$';
```

---

## 🚀 تحسينات الأداء

### 1. تحسين طلبات Supabase
```javascript
// ✅ تحديد الأعمدة المطلوبة فقط
.select('id, name, username, position, salary, currency, branch_id, role')

// ✅ استخدام single() بدلاً من limit(1)
.single()

// ✅ معالجة أخطاء PGRST116 بشكل صحيح
if (error.code === 'PGRST116') {
    // عدم وجود نتائج - ليس خطأ فادح
    return null;
}
```

### 2. تحسين التخزين المحلي
```javascript
// ✅ تنظيف البيانات قبل الحفظ
function saveData() {
    try {
        localStorage.setItem('employees', JSON.stringify(employees));
        localStorage.setItem('attendance', JSON.stringify(attendance));
        localStorage.setItem('branches', JSON.stringify(branches));
        localStorage.setItem('finances', JSON.stringify(finances));
    } catch (error) {
        console.error('❌ خطأ في حفظ البيانات محلياً:', error);
    }
}
```

---

## 📋 قائمة التحقق للمشاكل

### عند ظهور خطأ في حفظ البيانات:
- [ ] تحقق من اتصال الإنترنت
- [ ] تحقق من صحة إعدادات Supabase
- [ ] تحقق من صلاحيات الجدول في Supabase
- [ ] تحقق من تطابق أسماء الأعمدة
- [ ] تحقق من صحة البيانات المرسلة

### عند ظهور مشاكل في تسجيل الدخول:
- [ ] تحقق من اسم المستخدم وكلمة المرور
- [ ] تحقق من اتصال Supabase
- [ ] تحقق من وجود المستخدم في قاعدة البيانات
- [ ] تحقق من Console للأخطاء التفصيلية

### عند ظهور IDs غير صحيحة:
- [ ] قم بتشغيل `cleanLocalData()`
- [ ] تحقق من Console للرسائل التنظيفية
- [ ] أعد تحميل البيانات من Supabase
- [ ] احذف التخزين المحلي إذا لزم الأمر

---

## 🔬 أدوات المطور المتقدمة

### 1. مراقبة العمليات المالية
```javascript
// مراقبة إضافة العمليات المالية
window.addEventListener('financeAdded', (event) => {
    console.log('💰 تمت إضافة عملية مالية:', event.detail);
});
```

### 2. تتبع أخطاء Supabase
```javascript
// تسجيل مفصل لأخطاء Supabase
supabaseManager.supabase.auth.onAuthStateChange((event, session) => {
    console.log('🔐 تغيير حالة المصادقة:', event, session);
});
```

### 3. تشخيص شامل للنظام
```javascript
async function systemDiagnostic() {
    const diagnostic = {
        timestamp: new Date().toISOString(),
        database: getActiveDatabase(),
        supabaseConnected: supabaseManager?.isConnected,
        dataIntegrity: {
            employees: employees.filter(e => e.id && e.name).length,
            attendance: attendance.filter(a => a.id && a.employeeId).length,
            finances: finances.filter(f => f.id && f.employeeId).length,
            branches: branches.filter(b => b.id && b.name).length
        },
        localStorage: {
            size: JSON.stringify(localStorage).length,
            available: typeof Storage !== 'undefined'
        }
    };
    
    console.log('🔍 تشخيص شامل للنظام:', diagnostic);
    return diagnostic;
}
```

---

## 📞 الحصول على المساعدة

### معلومات مفيدة للدعم الفني:
1. **نوع المتصفح والإصدار**
2. **رسائل الخطأ من Console**
3. **خطوات إعادة إنتاج المشكلة**
4. **حالة الاتصال بـ Supabase**
5. **حجم البيانات المحلية**

### أوامر سريعة للتشخيص:
```javascript
// في console المتصفح
systemDiagnostic();              // تشخيص شامل
cleanLocalData();                // تنظيف البيانات
await reloadDataFromSupabase();  // إعادة تحميل من Supabase
```

---

## 🎯 الخلاصة

تم حل جميع المشاكل الأساسية:
- ✅ خطأ 400 في حفظ العمليات المالية
- ✅ خطأ 406 في تسجيل الدخول  
- ✅ مشكلة IDs المؤقتة غير الصحيحة
- ✅ تحسين معالجة الأخطاء
- ✅ تحسين الأداء العام

النظام الآن مستقر وجاهز للاستخدام الإنتاجي! 🚀 

## 🔧 مشاكل الاتصال بـ Supabase

### المشكلة: عدم تحميل البيانات من Supabase
```
الأعراض: لا يتم تحميل بيانات الموظفين أو الحضور
الحل: 
1. فحص الاتصال بالإنترنت
2. التحقق من إعدادات supabase-config.js
3. تجربة إعادة تحميل البيانات من الإعدادات
```

### المشكلة: أخطاء 400 أو 406 عند حفظ البيانات
```
الأعراض: رسائل خطأ عند إضافة موظف جديد أو عملية مالية
الحل:
1. التحقق من صحة البيانات المدخلة
2. إزالة الأعمدة غير المعرفة في قاعدة البيانات
3. التأكد من تنسيق التواريخ
```

## 🏢 مشاكل إدارة الفروع

### المشكلة: عدم ظهور الفروع في قائمة الاختيار
```
الأعراض: قائمة الفروع فارغة أو لا تظهر
الحل:
1. التحقق من وجود فروع في قاعدة البيانات
2. إعادة تحميل البيانات
3. التأكد من صحة اتصال Supabase
```

### المشكلة: عدم عمل التحقق من الموقع الجغرافي
```
الأعراض: لا يتم التحقق من موقع الموظف عند الحضور
الحل:
1. السماح بالوصول للموقع في المتصفح
2. التأكد من تفعيل خدمات الموقع في الجهاز
3. اختبار الموقع من إعدادات الفروع
```

## 📊 مشاكل البيانات المالية

### المشكلة: عدم ظهور السلف والخصومات في البيان المالي
```
الأعراض: تظهر القيم 0.00 حتى مع وجود بيانات مالية
الحل:
1. فتح Developer Console (F12)
2. البحث عن رسائل الخطأ
3. التحقق من وجود بيانات مالية للموظف
4. التأكد من صحة تواريخ العمليات المالية
```

### المشكلة: تضاعف البيانات المالية عند إعادة فتح التطبيق
```
الأعراض: كل مرة تفتح التطبيق تجد السلف والخصومات مضاعفة
الحل السريع:
1. اذهب إلى "البيان المالي"
2. اضغط زر "🧹 حذف المكرر"
3. ستحذف البيانات المكررة وتبقى واحدة من كل نوع
```

### إضافة بيانات مالية للاختبار
```javascript
// فتح Developer Console واستخدام الدوال التالية:

// 1. إضافة سلفة تجريبية
addTestFinancialData('employeeId', 'advance', 500, 'سلفة تجريبية');

// 2. إضافة خصم تجريبي
addTestFinancialData('employeeId', 'deduction', 100, 'خصم تجريبي');

// 3. عرض جميع البيانات المالية للموظف
showEmployeeFinances('employeeId');

// 4. إعادة تحميل البيان المالي
refreshEmployeeFinancialReport();

// 5. عرض معلومات التشخيص
printDiagnosticInfo();

// 6. حذف البيانات التجريبية
clearTestFinancialData('employeeId');

// 7. حذف البيانات المكررة (حل مشكلة التضاعف)
cleanDuplicateFinancialData();

// 8. إعادة تعيين جميع البيانات التجريبية
resetEmployeeFinancialData();
```

### التحقق من المشاكل الشائعة
```javascript
// التحقق من وجود البيانات المالية
console.log('عدد العمليات المالية:', finances.length);

// التحقق من البيانات المالية للموظف الحالي
const empFinances = finances.filter(fin => fin.employeeId === currentUser.id);
console.log('العمليات المالية للموظف:', empFinances);

// التحقق من صحة تاريخ العمليات
empFinances.forEach(fin => {
    console.log(`العملية: ${fin.type}, التاريخ: ${fin.date}, التاريخ المحول: ${new Date(fin.date).toLocaleDateString()}`);
});
```

## 🔄 مشاكل المزامنة

### المشكلة: البيانات لا تتحدث تلقائياً
```
الأعراض: البيانات قديمة أو لا تظهر التحديثات الجديدة
الحل:
1. إعادة تحميل الصفحة
2. استخدام زر "إعادة تحميل البيانات" في الإعدادات
3. التحقق من الاتصال بالإنترنت
```

### المشكلة: ظهور بيانات مكررة
```
الأعراض: نفس السجل يظهر أكثر من مرة
الحل:
1. حذف البيانات المحلية من localStorage
2. إعادة تحميل البيانات من Supabase
3. تنظيف البيانات من لوحة المدير
```

## 🔐 مشاكل تسجيل الدخول

### المشكلة: عدم قبول كلمة المرور
```
الأعراض: رسالة خطأ عند تسجيل الدخول
الحل:
1. التحقق من صحة اسم المستخدم وكلمة المرور
2. مسح cache المتصفح
3. المحاولة من متصفح آخر
```

### المشكلة: تسجيل الخروج التلقائي
```
الأعراض: يتم تسجيل الخروج تلقائياً بعد فترة
الحل:
1. التحقق من استقرار الاتصال بالإنترنت
2. عدم إغلاق التطبيق لفترة طويلة
3. إعادة تسجيل الدخول عند الحاجة
```

## 🔄 إعادة تهيئة النظام

### في حالة فشل جميع الحلول السابقة:
```
1. نسخ احتياطي من البيانات المهمة
2. مسح localStorage من Developer Console:
   localStorage.clear();
3. إعادة تحميل الصفحة
4. إعادة تسجيل الدخول
5. إعادة تحميل البيانات من Supabase
```

---

## 🆘 الدعم الفني

للحصول على مساعدة إضافية، يرجى:
1. تسجيل رسائل الخطأ من Developer Console
2. وصف المشكلة بالتفصيل
3. ذكر الخطوات التي تم اتخاذها قبل ظهور المشكلة

---

**تم إنشاء هذا الدليل بواسطة نظام إدارة الموارد البشرية - مجموعة الشهباء التجارية** 
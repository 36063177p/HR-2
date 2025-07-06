// ===== مدير Supabase لنظام إدارة الموارد البشرية =====

class SupabaseManager {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.isOnline = navigator.onLine;
        
        this.init();
        this.setupNetworkListeners();
    }
    
    async init() {
        if (!this.validateConfig()) {
            console.error('إعدادات Supabase غير صحيحة');
            return;
        }
        
        try {
            // تحميل مكتبة Supabase
            if (typeof createClient === 'undefined') {
                await this.loadSupabaseLibrary();
            }
            
            // إنشاء العميل
            this.supabase = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
            
            // اختبار الاتصال
            await this.testConnection();
            
        } catch (error) {
            console.error('خطأ في تهيئة Supabase:', error);
        }
    }
    
    async loadSupabaseLibrary() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/dist/umd/supabase.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    setupNetworkListeners() {
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showStatus('🌐 تم الاتصال بالإنترنت', 'success');
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showStatus('📱 وضع عدم الاتصال', 'warning');
        });
    }
    
    // ===== اختبار الاتصال =====
    async testConnection() {
        try {
            const { data, error } = await this.supabase
                .from('employees')
                .select('count')
                .limit(1);
            
            this.isConnected = true;
            console.log('✅ متصل مع Supabase');
            return true;
        } catch (error) {
            console.error('خطأ في الاتصال:', error);
            this.isConnected = false;
            return false;
        }
    }
    
    // ===== إعداد الجداول =====
    async setupTables() {
        if (!this.isConnected) {
            this.showStatus('❌ غير متصل مع Supabase', 'error');
            return false;
        }
        
        try {
            this.showStatus('🔧 جاري إعداد الجداول...', 'info');
            
            // إنشاء جدول الفروع أولاً
            await this.createTable('branches');
            
            // إنشاء جدول الموظفين
            await this.createTable('employees');
            
            // إنشاء جدول الحضور
            await this.createTable('attendance');
            
            // إنشاء جدول الشؤون المالية
            await this.createTable('finances');
            
            // التحقق من وإضافة عمود wifi_networks إذا لم يكن موجوداً
            await this.ensureWiFiNetworksColumn();
            
            // إضافة المدير الافتراضي
            await this.addDefaultAdmin();
            
            this.showStatus('✅ تم إعداد جميع الجداول بنجاح', 'success');
            return true;
            
        } catch (error) {
            console.error('خطأ في إعداد الجداول:', error);
            this.showStatus('❌ فشل في إعداد الجداول', 'error');
            return false;
        }
    }
    
    // دالة للتأكد من وجود عمود wifi_networks
    async ensureWiFiNetworksColumn() {
        try {
            console.log('🔍 فحص عمود wifi_networks في جدول branches...');
            
            // جرب استعلام بسيط للتحقق من وجود العمود
            const { data, error } = await this.supabase
                .from('branches')
                .select('wifi_networks')
                .limit(1);
            
            if (error && error.message && error.message.includes('wifi_networks')) {
                console.log('⚠️ عمود wifi_networks غير موجود');
                console.log('💡 يرجى إضافة العمود في Supabase SQL Editor:');
                console.log('ALTER TABLE branches ADD COLUMN wifi_networks TEXT[];');
                
                this.showStatus('⚠️ يرجى إضافة عمود wifi_networks في SQL Editor', 'warning');
            } else {
                console.log('✅ عمود wifi_networks موجود بالفعل');
            }
            
        } catch (error) {
            console.warn('تحذير: لم يتم التحقق من عمود wifi_networks:', error);
            console.log('💡 إذا واجهت مشاكل مع شبكات WiFi، أضف العمود يدوياً في Supabase SQL Editor:');
            console.log('ALTER TABLE branches ADD COLUMN wifi_networks TEXT[];');
        }
    }
    
    async createTable(tableName) {
        // في Supabase، يجب إنشاء الجداول من لوحة التحكم أو SQL Editor
        // هذه الدالة ستتحقق من وجود الجدول
        try {
            const { data, error } = await this.supabase
                .from(tableName)
                .select('*')
                .limit(1);
            
            if (error && error.code === 'PGRST116') {
                throw new Error(`جدول ${tableName} غير موجود`);
            }
            
            console.log(`✅ جدول ${tableName} موجود`);
        } catch (error) {
            console.error(`❌ مشكلة في جدول ${tableName}:`, error.message);
            throw error;
        }
    }
    
    async addDefaultAdmin() {
        try {
            // التحقق من وجود المدير
            const { data: existingAdmin } = await this.supabase
                .from('employees')
                .select('id')
                .eq('username', 'admin')
                .single();
            
            if (existingAdmin) {
                console.log('المدير الافتراضي موجود بالفعل');
                return;
            }
            
            // إضافة المدير الافتراضي
            const { error } = await this.supabase
                .from('employees')
                .insert([{
                    name: 'المدير العام',
                    username: 'admin',
                    password: 'admin123',
                    position: 'مدير',
                    salary: 0,
                    currency: 'SAR',
                    role: 'manager'
                }]);
            
            if (error) throw error;
            
            console.log('✅ تم إضافة المدير الافتراضي');
            
        } catch (error) {
            console.error('خطأ في إضافة المدير الافتراضي:', error);
        }
    }
    
    // ===== عمليات الموظفين =====
    async saveEmployee(employee) {
        try {
            // التحقق من branchId - إذا كان timestamp (أرقام فقط) أو فارغ، نرسل null
            let branchId = null;
            if (employee.branchId && employee.branchId.toString().match(/^\d{13,}$/)) {
                // إذا كان timestamp (أرقام فقط)، نرسل null
                branchId = null;
            } else if (employee.branchId && employee.branchId !== '') {
                // إذا كان UUID صحيح أو معرف آخر صحيح
                branchId = employee.branchId;
            }
            
            const { data, error } = await this.supabase
                .from('employees')
                .insert([{
                    name: employee.name,
                    username: employee.username,
                    password: employee.password,
                    position: employee.position,
                    salary: parseFloat(employee.salary),
                    currency: employee.currency || 'SAR',
                    branch_id: branchId,
                    role: employee.role || 'employee'
                }])
                .select();
            
            if (error) throw error;
            this.showStatus('✅ تم حفظ الموظف', 'success');
            return data[0];
        } catch (error) {
            console.error('خطأ في حفظ الموظف:', error);
            this.showStatus('❌ فشل في حفظ الموظف', 'error');
            throw error;
        }
    }
    
    async loadEmployees() {
        try {
            const { data, error } = await this.supabase
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            // تحويل البيانات للصيغة المطلوبة
            const employees = data.map(emp => ({
                id: emp.id,
                name: emp.name,
                username: emp.username,
                password: emp.password,
                position: emp.position,
                salary: emp.salary,
                currency: emp.currency,
                branchId: emp.branch_id,
                role: emp.role
            }));
            
            localStorage.setItem('employees', JSON.stringify(employees));
            return employees;
            
        } catch (error) {
            console.error('خطأ في تحميل الموظفين:', error);
            return JSON.parse(localStorage.getItem('employees')) || [];
        }
    }
    
    async deleteEmployee(employeeId) {
        try {
            // حذف جميع البيانات المرتبطة بالموظف أولاً
            console.log(`🗑️ حذف جميع بيانات الموظف ${employeeId}...`);
            
            // حذف سجلات الحضور
            const { error: attendanceError } = await this.supabase
                .from('attendance')
                .delete()
                .eq('employee_id', employeeId);
            
            if (attendanceError) {
                console.warn('تحذير: خطأ في حذف سجلات الحضور:', attendanceError);
            } else {
                console.log('✅ تم حذف سجلات الحضور');
            }
            
            // حذف العمليات المالية
            const { error: financeError } = await this.supabase
                .from('finances')
                .delete()
                .eq('employee_id', employeeId);
            
            if (financeError) {
                console.warn('تحذير: خطأ في حذف العمليات المالية:', financeError);
            } else {
                console.log('✅ تم حذف العمليات المالية');
            }
            
            // حذف الموظف نفسه
            const { error } = await this.supabase
                .from('employees')
                .delete()
                .eq('id', employeeId);
            
            if (error) throw error;
            
            this.showStatus('✅ تم حذف الموظف وجميع بياناته بنجاح', 'success');
            return true;
            
        } catch (error) {
            console.error('خطأ في حذف الموظف:', error);
            this.showStatus('❌ فشل في حذف الموظف', 'error');
            return false;
        }
    }
    
    // ===== عمليات الحضور =====
    async saveAttendance(attendance) {
        try {
            console.log('🔍 بدء حفظ الحضور:', {
                originalId: attendance.id,
                employeeId: attendance.employeeId,
                employeeName: attendance.employeeName,
                date: attendance.date
            });
            
            // التحقق من employeeId - إذا كان timestamp (أرقام فقط)، تخطي الحفظ
            if (attendance.employeeId && attendance.employeeId.toString().match(/^\d{13,}$/)) {
                console.warn('تخطي حفظ الحضور - employee_id هو timestamp:', attendance.employeeId);
                return null;
            }
            
            // التأكد من أن checkIn و checkOut في التنسيق الصحيح (24 ساعة)
            let checkInTime = attendance.checkIn;
            let checkOutTime = attendance.checkOut;
            
            // إذا كان الوقت بالصيغة العربية، تحويله إلى 24 ساعة
            if (checkInTime && (checkInTime.includes('ص') || checkInTime.includes('م'))) {
                const tempDate = new Date(`2000-01-01 ${checkInTime}`);
                const originalTime = checkInTime;
                checkInTime = tempDate.toTimeString().slice(0, 8);
                console.log(`🔄 تحويل وقت الحضور: ${originalTime} → ${checkInTime}`);
            }
            
            if (checkOutTime && (checkOutTime.includes('ص') || checkOutTime.includes('م'))) {
                const tempDate = new Date(`2000-01-01 ${checkOutTime}`);
                const originalTime = checkOutTime;
                checkOutTime = tempDate.toTimeString().slice(0, 8);
                console.log(`🔄 تحويل وقت الانصراف: ${originalTime} → ${checkOutTime}`);
            }
            
            // إنشاء كائن البيانات بدون ID أولاً
            const attendanceData = {
                employee_id: attendance.employeeId,
                employee_name: attendance.employeeName,
                date: attendance.date,
                check_in: checkInTime,
                check_out: checkOutTime,
                total_hours: parseFloat(attendance.totalHours) || 0,
                time_display: attendance.timeDisplay,
                location: attendance.location,
                distance: parseFloat(attendance.distance) || null
            };
            
            // إضافة ID فقط إذا كان صالحاً (UUID حقيقي)
            const hasValidId = attendance.id && 
                               !attendance.id.toString().startsWith('temp_') && 
                               attendance.id.length > 10;
            
            if (hasValidId) {
                attendanceData.id = attendance.id;
                console.log('🔄 تحديث سجل حضور موجود بـ ID:', attendance.id);
            } else {
                console.log('➕ إنشاء سجل حضور جديد (Supabase سينشئ UUID تلقائياً)');
            }
            
            console.log('🚀 إرسال البيانات إلى Supabase:', {
                attendanceData,
                upsertMode: hasValidId ? 'UPDATE (by id)' : 'INSERT/UPDATE (by employee_id,date)'
            });
            
            const { data, error } = await this.supabase
                .from('attendance')
                .upsert([attendanceData], {
                    onConflict: hasValidId ? 'id' : 'employee_id,date'
                })
                .select();
            
            if (error) {
                console.error('❌ Supabase Error Details:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint,
                    sentData: attendanceData
                });
                throw error;
            }
            
            console.log('✅ تم حفظ الحضور في Supabase بنجاح:', {
                id: data[0].id,
                checkIn: data[0].check_in,
                checkOut: data[0].check_out
            });
            
            this.showStatus('✅ تم تسجيل الحضور', 'success');
            return data[0];
            
        } catch (error) {
            console.error('خطأ في تسجيل الحضور:', error);
            this.showStatus('❌ فشل في تسجيل الحضور', 'error');
            throw error;
        }
    }
    
    async loadAttendance() {
        try {
            const { data, error } = await this.supabase
                .from('attendance')
                .select('*')
                .order('date', { ascending: false });
            
            if (error) throw error;
            
            const attendance = data.map(att => ({
                id: att.id,
                employeeId: att.employee_id,
                employeeName: att.employee_name,
                date: att.date,
                checkIn: att.check_in,
                checkInDisplay: att.check_in ? new Date(`2000-01-01 ${att.check_in}`).toLocaleTimeString('ar-SA') : null,
                checkOut: att.check_out,
                checkOutDisplay: att.check_out ? new Date(`2000-01-01 ${att.check_out}`).toLocaleTimeString('ar-SA') : null,
                totalHours: att.total_hours,
                timeDisplay: att.time_display,
                location: att.location,
                distance: att.distance
            }));
            
            localStorage.setItem('attendance', JSON.stringify(attendance));
            return attendance;
            
        } catch (error) {
            console.error('خطأ في تحميل الحضور:', error);
            return JSON.parse(localStorage.getItem('attendance')) || [];
        }
    }
    
    async deleteAttendance(attendanceId) {
        try {
            const { error } = await this.supabase
                .from('attendance')
                .delete()
                .eq('id', attendanceId);
            
            if (error) throw error;
            
            this.showStatus('✅ تم حذف سجل الحضور بنجاح', 'success');
            return true;
            
        } catch (error) {
            console.error('خطأ في حذف سجل الحضور:', error);
            this.showStatus('❌ فشل في حذف سجل الحضور', 'error');
            return false;
        }
    }
    
    // ===== عمليات الفروع =====
    async saveBranch(branch) {
        try {
            console.log('🏢 بدء حفظ الفرع:', {
                originalId: branch.id,
                name: branch.name,
                hasWifiNetworks: !!(branch.wifiNetworks && branch.wifiNetworks.length)
            });
            
            const branchData = {
                name: branch.name,
                address: branch.address || '',
                latitude: parseFloat(branch.latitude) || null,
                longitude: parseFloat(branch.longitude) || null,
                radius: parseInt(branch.radius) || 100
            };
            
            // إضافة wifi_networks فقط إذا كان هناك دعم لها
            if (branch.wifiNetworks) {
                branchData.wifi_networks = Array.isArray(branch.wifiNetworks) ? branch.wifiNetworks : [];
            }
            
            // التحقق من صحة ID - فقط UUIDs حقيقية
            const hasValidId = branch.id && 
                               !branch.id.toString().startsWith('temp_') && 
                               branch.id.length > 20 && // UUID أطول من 20 حرف
                               branch.id.includes('-'); // UUID يحتوي على شرطات
            
            console.log('🔍 تحليل ID:', {
                id: branch.id,
                hasValidId,
                operation: hasValidId ? 'UPDATE' : 'INSERT'
            });
            
            let result;
            if (hasValidId) {
                // تحديث فرع موجود
                branchData.id = branch.id;
                const { data, error } = await this.supabase
                    .from('branches')
                    .upsert([branchData], {
                        onConflict: 'id'
                    })
                    .select('*');
                
                if (error) {
                    console.error('❌ خطأ في upsert:', error);
                    throw error;
                }
                result = data[0];
                console.log('✅ تم تحديث الفرع:', result.id);
                
            } else {
                // إنشاء فرع جديد
                const { data, error } = await this.supabase
                    .from('branches')
                    .insert([branchData])
                    .select('*');
                
                if (error) {
                    console.error('❌ خطأ في insert:', error);
                    // إذا كانت المشكلة في wifi_networks، جرب بدونها
                    if (error.message && error.message.includes('wifi_networks')) {
                        console.log('🔄 محاولة الحفظ بدون wifi_networks...');
                        delete branchData.wifi_networks;
                        
                        const { data: retryData, error: retryError } = await this.supabase
                            .from('branches')
                            .insert([branchData])
                            .select('*');
                        
                        if (retryError) throw retryError;
                        result = retryData[0];
                        console.log('✅ تم حفظ الفرع بدون wifi_networks:', result.id);
                    } else {
                        throw error;
                    }
                } else {
                    result = data[0];
                    console.log('✅ تم إنشاء الفرع:', result.id);
                }
            }
            
            this.showStatus('✅ تم حفظ الفرع', 'success');
            return result;
            
        } catch (error) {
            console.error('❌ خطأ في حفظ الفرع:', error);
            console.error('تفاصيل الخطأ:', {
                code: error.code,
                message: error.message,
                details: error.details,
                hint: error.hint
            });
            this.showStatus('❌ فشل في حفظ الفرع', 'error');
            throw error;
        }
    }
    
    async loadBranches() {
        try {
            console.log('📂 بدء تحميل الفروع من Supabase...');
            
            const { data, error } = await this.supabase
                .from('branches')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('❌ خطأ في تحميل الفروع:', error);
                throw error;
            }
            
            console.log(`📊 تم تحميل ${data.length} فرع من Supabase`);
            
            const branches = data.map(branch => {
                const branchData = {
                    id: branch.id,
                    name: branch.name,
                    address: branch.address || '',
                    latitude: branch.latitude,
                    longitude: branch.longitude,
                    radius: branch.radius || 100,
                    wifiNetworks: [], // قيمة افتراضية
                    createdAt: branch.created_at
                };
                
                // إضافة wifi_networks إذا كان موجود
                if (branch.wifi_networks) {
                    branchData.wifiNetworks = Array.isArray(branch.wifi_networks) ? branch.wifi_networks : [];
                }
                
                return branchData;
            });
            
            localStorage.setItem('branches', JSON.stringify(branches));
            console.log('✅ تم حفظ الفروع في التخزين المحلي');
            return branches;
            
        } catch (error) {
            console.error('❌ خطأ في تحميل الفروع:', error);
            console.log('📂 التراجع للبيانات المحلية...');
            const localBranches = JSON.parse(localStorage.getItem('branches')) || [];
            console.log(`📊 تم تحميل ${localBranches.length} فرع من التخزين المحلي`);
            return localBranches;
        }
    }
    
    async deleteBranch(branchId) {
        try {
            console.log('🗑️ بدء حذف الفرع:', branchId);
            
            // التحقق من صحة ID - لا نحذف الفروع المؤقتة من Supabase
            const isValidId = branchId && 
                             !branchId.toString().startsWith('temp_') && 
                             branchId.length > 20 && 
                             branchId.includes('-');
            
            if (!isValidId) {
                console.log('⚠️ ID مؤقت - لن يتم الحذف من Supabase:', branchId);
                this.showStatus('✅ تم حذف الفرع من البيانات المحلية', 'success');
                return true;
            }
            
            console.log('🔄 حذف الفرع من Supabase...', branchId);
            
            const { error } = await this.supabase
                .from('branches')
                .delete()
                .eq('id', branchId);
            
            if (error) {
                console.error('❌ خطأ في حذف الفرع:', error);
                console.error('تفاصيل الخطأ:', {
                    code: error.code,
                    message: error.message,
                    details: error.details,
                    hint: error.hint
                });
                throw error;
            }
            
            console.log('✅ تم حذف الفرع من Supabase بنجاح');
            this.showStatus('✅ تم حذف الفرع بنجاح', 'success');
            return true;
            
        } catch (error) {
            console.error('❌ خطأ في حذف الفرع:', error);
            this.showStatus('❌ فشل في حذف الفرع', 'error');
            return false;
        }
    }
    
    // ===== عمليات الشؤون المالية =====
    async saveFinance(finance) {
        try {
            // التحقق من employeeId - إذا كان timestamp (أرقام فقط)، تخطي الحفظ
            if (finance.employeeId && finance.employeeId.toString().match(/^\d{13,}$/)) {
                console.warn('تخطي حفظ العملية المالية - employee_id هو timestamp:', finance.employeeId);
                return null;
            }
            
            // تنظيف البيانات قبل الإرسال
            const financeData = {
                employee_id: finance.employeeId,
                employee_name: finance.employeeName,
                type: finance.type,
                amount: parseFloat(finance.amount),
                reason: finance.reason,
                date: finance.date
            };
            
            // إضافة week_paid فقط إذا كان النوع payment
            if (finance.type === 'payment' && finance.weekPaid) {
                financeData.week_paid = finance.weekPaid;
            }
            
            console.log('📤 بيانات العملية المالية للإرسال:', financeData);
            
            const { data, error } = await this.supabase
                .from('finances')
                .insert([financeData])
                .select();
            
            if (error) throw error;
            this.showStatus('✅ تم حفظ العملية المالية', 'success');
            return data[0];
            
        } catch (error) {
            console.error('خطأ في حفظ العملية المالية:', error);
            this.showStatus('❌ فشل في حفظ العملية المالية', 'error');
            throw error;
        }
    }
    
    async loadFinances() {
        try {
            const { data, error } = await this.supabase
                .from('finances')
                .select('*')
                .order('date', { ascending: false });
            
            if (error) throw error;
            
            const finances = data.map(fin => ({
                id: fin.id,
                employeeId: fin.employee_id,
                employeeName: fin.employee_name,
                type: fin.type,
                amount: fin.amount,
                reason: fin.reason,
                date: fin.date
            }));
            
            localStorage.setItem('finances', JSON.stringify(finances));
            return finances;
            
        } catch (error) {
            console.error('خطأ في تحميل الشؤون المالية:', error);
            return JSON.parse(localStorage.getItem('finances')) || [];
        }
    }
    
    async deleteFinance(financeId) {
        try {
            const { error } = await this.supabase
                .from('finances')
                .delete()
                .eq('id', financeId);
            
            if (error) throw error;
            
            this.showStatus('✅ تم حذف العملية المالية بنجاح', 'success');
            return true;
            
        } catch (error) {
            console.error('خطأ في حذف العملية المالية:', error);
            this.showStatus('❌ فشل في حذف العملية المالية', 'error');
            return false;
        }
    }
    
    // ===== نقل البيانات من النظام القديم =====
    async migrateFromLocalStorage() {
        try {
            this.showStatus('🔄 جاري نقل البيانات من النظام القديم...', 'info');
            
            let migratedCount = 0;
            
            // نقل الفروع أولاً
            const oldBranches = JSON.parse(localStorage.getItem('branches')) || [];
            for (const branch of oldBranches) {
                try {
                    await this.saveBranch(branch);
                    migratedCount++;
                } catch (error) {
                    console.error('خطأ في نقل فرع:', error);
                }
            }
            
            // نقل الموظفين
            const oldEmployees = JSON.parse(localStorage.getItem('employees')) || [];
            for (const employee of oldEmployees) {
                try {
                    await this.saveEmployee(employee);
                    migratedCount++;
                } catch (error) {
                    console.error('خطأ في نقل موظف:', error);
                }
            }
            
            // نقل الحضور
            const oldAttendance = JSON.parse(localStorage.getItem('attendance')) || [];
            for (const attendance of oldAttendance) {
                try {
                    await this.saveAttendance(attendance);
                    migratedCount++;
                } catch (error) {
                    console.error('خطأ في نقل حضور:', error);
                }
            }
            
            // نقل الشؤون المالية
            const oldFinances = JSON.parse(localStorage.getItem('finances')) || [];
            for (const finance of oldFinances) {
                try {
                    await this.saveFinance(finance);
                    migratedCount++;
                } catch (error) {
                    console.error('خطأ في نقل شأن مالي:', error);
                }
            }
            
            this.showStatus(`✅ تم نقل ${migratedCount} عنصر بنجاح`, 'success');
            
        } catch (error) {
            console.error('خطأ في نقل البيانات:', error);
            this.showStatus('❌ فشل في نقل البيانات', 'error');
        }
    }
    
    // ===== دوال مساعدة =====
    validateConfig() {
        const { url, anonKey } = SUPABASE_CONFIG;
        
        if (url === 'YOUR_SUPABASE_URL' || !url) {
            console.error('⚠️ يرجى تحديث SUPABASE URL في ملف supabase-config.js');
            return false;
        }
        
        if (anonKey === 'YOUR_SUPABASE_ANON_KEY' || !anonKey) {
            console.error('⚠️ يرجى تحديث SUPABASE ANON KEY في ملف supabase-config.js');
            return false;
        }
        
        return true;
    }
    
    showStatus(message, type = 'info') {
        // إنشاء أو تحديث عنصر عرض الحالة
        let statusElement = document.getElementById('supabaseStatus');
        if (!statusElement) {
            statusElement = document.createElement('div');
            statusElement.id = 'supabaseStatus';
            statusElement.className = 'supabase-status';
            statusElement.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                padding: 10px 15px;
                border-radius: 5px;
                z-index: 9999;
                font-family: Arial, sans-serif;
                font-size: 14px;
            `;
            document.body.appendChild(statusElement);
        }
        
        const colors = {
            success: '#d4edda',
            error: '#f8d7da',
            warning: '#fff3cd',
            info: '#d1ecf1'
        };
        
        statusElement.textContent = message;
        statusElement.style.background = colors[type] || colors.info;
        statusElement.style.display = 'block';
        
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 3000);
        
        console.log(`Supabase: ${message}`);
    }
    
    // ===== دوال تحميل البيانات المطلوبة في script.js =====
    async getAllEmployees() {
        return await this.loadEmployees();
    }
    
    async getAllBranches() {
        return await this.loadBranches();
    }
    
    async getAllAttendance() {
        return await this.loadAttendance();
    }
    
    async getAllFinances() {
        return await this.loadFinances();
    }
    
    getStats() {
        return {
            isConnected: this.isConnected,
            isOnline: this.isOnline,
            url: SUPABASE_CONFIG.url
        };
    }
}

// إنشاء مثيل من Supabase Manager
const supabaseManager = new SupabaseManager(); 
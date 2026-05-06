import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { getPayrollList, updatePayroll, getAttendanceDetail, updateSalaryHistory, calculateProrate } from '../services/api';
import AttendanceDetail from './AttendanceDetail';

const Payroll = () => {
  const [payrollData, setPayrollData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState(null);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [viewingDetail, setViewingDetail] = useState(false);
  const [userRole, setUserRole] = useState('employee');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [attendanceEmployeeId, setAttendanceEmployeeId] = useState(null);
  const [viewingAttendance, setViewingAttendance] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showUpdateSalaryForm, setShowUpdateSalaryForm] = useState(false);
  const [updateFormData, setUpdateFormData] = useState({
    newSalary: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: 'Tăng lương định kỳ'
  });
  const [calculation, setCalculation] = useState(null);
  const [updating, setUpdating] = useState(false);
  const [editableFields, setEditableFields] = useState({
    baseSalary: '',
    allowance: '0',
    bonus: '',
    advance: '0',
    other: '0'
  });

  useEffect(() => {
    const storedRole = localStorage.getItem('role') || 'employee';
    const normalizedRole = storedRole.toLowerCase();
    setUserRole(normalizedRole);
    const uid = localStorage.getItem('user_id') || localStorage.getItem('userId') || null;
    setCurrentUserId(uid);

    const fetchPayroll = async () => {
      try {
        setLoading(true);
        const res = await getPayrollList(selectedMonth, selectedYear);
        setPayrollData(res.data);
      } catch (err) {
        console.error("Lỗi lấy dữ liệu lương:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayroll();
  }, [selectedMonth, selectedYear]);

  const displayPayrollData = useMemo(() => payrollData, [payrollData]);

  const getCurrentBaseSalary = () => {
    if (isEditing && editableFields.baseSalary !== '') {
      return parseFloat(editableFields.baseSalary) || 0;
    }
    return parseFloat(employeeDetails?.BaseSalary) || 0;
  };

  const getCurrentBonus = () => {
    if (isEditing && editableFields.bonus !== '') {
      return parseFloat(editableFields.bonus) || 0;
    }
    return parseFloat(employeeDetails?.Bonus) || 0;
  };

  const getCurrentAllowance = () => {
    if (isEditing && editableFields.allowance !== '') {
      return parseFloat(editableFields.allowance) || 0;
    }
    return parseFloat(editableFields.allowance) || 0;
  };

  const getCurrentAdvance = () => {
    if (isEditing && editableFields.advance !== '') {
      return parseFloat(editableFields.advance) || 0;
    }
    return parseFloat(editableFields.advance) || 0;
  };

  const getCurrentOther = () => {
    if (isEditing && editableFields.other !== '') {
      return parseFloat(editableFields.other) || 0;
    }
    return parseFloat(editableFields.other) || 0;
  };

  const calculateSocialIns = () => getCurrentBaseSalary() * 0.08;
  const calculateHealthIns = () => getCurrentBaseSalary() * 0.015;
  const calculateUnempIns = () => getCurrentBaseSalary() * 0.01;
  const calculatePersonalTax = () => (parseFloat(employeeDetails?.Deductions) || 0) * 0.5;
  
  const calculateTotalDeductions = () => {
    return calculateSocialIns() + calculateHealthIns() + calculateUnempIns() + 
           calculatePersonalTax() + getCurrentAdvance() + getCurrentOther();
  };

  const getTotalIncome = () => {
    return getCurrentBaseSalary() + getCurrentBonus() + getCurrentAllowance();
  };

  const getNetSalary = () => {
    return getTotalIncome() - calculateTotalDeductions();
  };

  const formatMoney = (amount) => {
    if (!amount && amount !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  const totalNetSalary = useMemo(() => {
    return displayPayrollData.reduce((sum, item) => {
      const base = parseFloat(item.BaseSalary) || 0;
      const bonus = parseFloat(item.Bonus) || 0;
      const allowance = parseFloat(item.AllowanceResponsibility) || 0;
      const advance = parseFloat(item.AdvancePayment) || 0;
      const other = parseFloat(item.OtherDeduction) || 0;
      const deductions = parseFloat(item.Deductions) || 0;
      const totalDeductions = (base * 0.08) + (base * 0.015) + (base * 0.01) + (deductions * 0.5) + advance + other;
      return sum + (base + bonus + allowance - totalDeductions);
    }, 0);
  }, [displayPayrollData]);

  const handleUpdatePayroll = async () => {
    if (userRole !== 'admin' && userRole !== 'manager') {
      alert('❌ Bạn không có quyền thực hiện chức năng này!');
      return;
    }
    
    const confirmUpdate = window.confirm(
      'Bạn có chắc chắn muốn cập nhật bảng lương?\n\n' +
      'Hành động này sẽ đồng bộ dữ liệu lương từ hệ thống HR và tính toán lại theo quy định mới nhất.'
    );
    
    if (!confirmUpdate) return;
    
    try {
      setLoading(true);
      const refreshResponse = await getPayrollList(selectedMonth, selectedYear);
      setPayrollData(refreshResponse.data);
      alert('✅ Cập nhật bảng lương thành công!');
    } catch (error) {
      console.error('Lỗi cập nhật lương:', error);
      alert(`❌ Cập nhật thất bại: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (e, employee) => {
    e.preventDefault();
    setSelectedEmployee(employee);
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDoubleClick = (employee) => {
    setSelectedEmployee(employee);
    setContextMenu({ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 });
  };

  const canEditSalary = () => userRole === 'admin' || userRole === 'manager';

  const handleViewDetails = () => {
    setEmployeeDetails(selectedEmployee);
    setViewingDetail(true);
    setIsEditing(false);
    setContextMenu(null);
    setEditableFields({
      baseSalary: selectedEmployee.BaseSalary?.toString() || '',
      allowance: selectedEmployee.AllowanceResponsibility?.toString() || '0',
      bonus: selectedEmployee.Bonus?.toString() || '',
      advance: selectedEmployee.AdvancePayment?.toString() || '0',
      other: selectedEmployee.OtherDeduction?.toString() || '0'
    });
  };

  const handleViewAttendance = () => {
    setAttendanceEmployeeId(selectedEmployee?.EmployeeID);
    setViewingAttendance(true);
    setContextMenu(null);
  };

  const handleOpenUpdateSalary = () => {
    setUpdateFormData({
      newSalary: selectedEmployee?.BaseSalary != null ? String(selectedEmployee.BaseSalary) : '',
      effectiveDate: new Date().toISOString().split('T')[0],
      reason: 'Tăng lương định kỳ'
    });
    setCalculation(null);
    setShowUpdateSalaryForm(true);
    setContextMenu(null);
  };

  const handleCloseUpdateSalaryForm = () => {
    const defaultEffectiveDate = new Date().toISOString().split('T')[0];
    const isDirty = (
      parseFloat(updateFormData.newSalary || '0') !== (selectedEmployee?.BaseSalary || 0) ||
      updateFormData.effectiveDate !== defaultEffectiveDate ||
      updateFormData.reason !== 'Tăng lương định kỳ' ||
      calculation !== null
    );
    if (isDirty) {
      const confirmCancel = window.confirm('Bạn có chắc muốn hủy? Tất cả thay đổi sẽ bị mất.');
      if (!confirmCancel) return;
    }
    setShowUpdateSalaryForm(false);
    setCalculation(null);
  };

  const calculateProrateData = async () => {
    if (!updateFormData.effectiveDate) {
      alert('Vui lòng chọn ngày áp dụng!');
      return;
    }
    const newSalaryNum = parseFloat(updateFormData.newSalary) || 0;
    if (newSalaryNum === (selectedEmployee?.BaseSalary || 0)) {
      alert('Lương mới không thay đổi so với lương hiện tại!');
      return;
    }

    setUpdating(true);
    try {
      const response = await calculateProrate({
        old_salary: selectedEmployee?.BaseSalary || 0,
        new_salary: newSalaryNum,
        effective_date: updateFormData.effectiveDate
      });

      if (response.data.success) {
        setCalculation(response.data.calculation);
      } else {
        alert('Không thể tính toán prorate!');
      }
    } catch (error) {
      console.error('Lỗi tính prorate:', error);
      alert(`Lỗi: ${error.response?.data?.error || error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveUpdateSalary = async () => {
    const newSalaryNum = parseFloat(updateFormData.newSalary) || 0;
    if (newSalaryNum === (selectedEmployee?.BaseSalary || 0)) {
      alert('Lương mới không thay đổi so với lương hiện tại!');
      return;
    }

    const confirmUpdate = window.confirm(
      `Xác nhận cập nhật lương cho ${selectedEmployee?.FullName}?\n\n` +
      `📊 Lương cũ: ${formatMoney(selectedEmployee?.BaseSalary)}\n` +
      `📈 Lương mới: ${formatMoney(newSalaryNum)}\n` +
      `📅 Áp dụng từ: ${updateFormData.effectiveDate}\n` +
      `📝 Lý do: ${updateFormData.reason}\n\n` +
      `⚠️ Lưu ý: Hành động này sẽ tạo lịch sử lương và áp dụng cho các kỳ lương tương lai.`
    );
    
    if (!confirmUpdate) return;
    
    setUpdating(true);
    try {
      const response = await updateSalaryHistory({
        employee_id: selectedEmployee.EmployeeID,
        new_salary: newSalaryNum,
        effective_date: updateFormData.effectiveDate,
        reason: updateFormData.reason,
        created_by: localStorage.getItem('user_id') || 1
      });
      
      if (response.data.success) {
        alert(response.data.message);
        // Refresh lại dữ liệu
        const refreshResponse = await getPayrollList(selectedMonth, selectedYear);
        setPayrollData(refreshResponse.data);
        setShowUpdateSalaryForm(false);
        setCalculation(null);
      }
    } catch (error) {
      console.error('Lỗi cập nhật lương:', error);
      alert(`Lỗi: ${error.response?.data?.error || error.message}`);
    } finally {
      setUpdating(false);
    }
  };

  const handleFieldChange = (field, value) => {
    // For numeric fields, prevent negative values and keep as string for controlled inputs
    const numericFields = ['baseSalary', 'allowance', 'bonus', 'advance', 'other'];
    if (numericFields.includes(field)) {
      // allow empty input while typing
      if (value === '') {
        setEditableFields(prev => ({ ...prev, [field]: '' }));
        return;
      }
      // strip leading '-' to prevent negative values
      if (String(value).startsWith('-')) {
        value = String(value).slice(1);
      }
      setEditableFields(prev => ({ ...prev, [field]: value }));
      return;
    }
    setEditableFields(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveSalary = async () => {
    if (!canEditSalary()) {
      alert('❌ Bạn không có quyền sửa lương!');
      return;
    }

    const newBaseSalary = parseFloat(editableFields.baseSalary) || 0;
    const newBonus = parseFloat(editableFields.bonus) || 0;
    const newAllowance = parseFloat(editableFields.allowance) || 0;
    const newAdvance = parseFloat(editableFields.advance) || 0;
    const newOther = parseFloat(editableFields.other) || 0;

    const confirmSave = window.confirm(
      `Xác nhận cập nhật lương cho ${employeeDetails?.FullName}?\n\n` +
      `📊 Lương cơ bản: ${formatMoney(newBaseSalary)}\n` +
      `💰 Phụ cấp: ${formatMoney(newAllowance)}\n` +
      `🎁 Thưởng: ${formatMoney(newBonus)}\n` +
      `💸 Tạm ứng: ${formatMoney(newAdvance)}\n` +
      `📝 Khấu trừ khác: ${formatMoney(newOther)}`
    );
    
    if (!confirmSave) return;

    try {
      setLoading(true);
      const response = await updatePayroll(employeeDetails.SalaryID, {
        baseSalary: newBaseSalary,
        bonus: newBonus,
        allowance: newAllowance,
        advance: newAdvance,
        other: newOther
      });

      if (response.status === 200) {
        const refreshResponse = await getPayrollList(selectedMonth, selectedYear);
        setPayrollData(refreshResponse.data);
        alert('✅ Cập nhật lương thành công!');
        setIsEditing(false);
        setViewingDetail(false);
        setEmployeeDetails(null);
      }
    } catch (error) {
      console.error('Lỗi chi tiết:', error.response?.data || error);
      alert(`❌ Cập nhật thất bại: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    const dirty = (
      (editableFields.baseSalary !== (employeeDetails?.BaseSalary?.toString() || '')) ||
      (editableFields.allowance !== (employeeDetails?.AllowanceResponsibility?.toString() || '0')) ||
      (editableFields.bonus !== (employeeDetails?.Bonus?.toString() || '')) ||
      (editableFields.advance !== (employeeDetails?.AdvancePayment?.toString() || '0')) ||
      (editableFields.other !== (employeeDetails?.OtherDeduction?.toString() || '0'))
    );
    if (dirty) {
      const confirmCancel = window.confirm('Bạn có chắc muốn hủy các thay đổi? Tất cả thay đổi sẽ bị mất.');
      if (!confirmCancel) return;
    }
    setEditableFields({
      baseSalary: employeeDetails?.BaseSalary?.toString() || '',
      allowance: employeeDetails?.AllowanceResponsibility?.toString() || '0',
      bonus: employeeDetails?.Bonus?.toString() || '',
      advance: employeeDetails?.AdvancePayment?.toString() || '0',
      other: employeeDetails?.OtherDeduction?.toString() || '0'
    });
    setIsEditing(false);
  };

  const handleBackFromDetail = () => {
    // If editing with unsaved changes, confirm before navigating back
    if (isEditing) {
      const confirmBack = window.confirm('Bạn đang chỉnh sửa. Quay lại sẽ bỏ các thay đổi. Tiếp tục?');
      if (!confirmBack) return;
    }
    setViewingDetail(false);
    setEmployeeDetails(null);
    setIsEditing(false);
  };

  const exportPayrollListExcel = () => {
    if (userRole === 'employee') return;
    const wsData = [['Mã Lương','Mã NV','Họ Tên','Lương Cơ Bản','Thưởng','Phụ cấp','Khấu Trừ','Thực Lãnh']];
    displayPayrollData.forEach(item => {
      const base = parseFloat(item.BaseSalary) || 0;
      const bonus = parseFloat(item.Bonus) || 0;
      const allowance = parseFloat(item.AllowanceResponsibility) || 0;
      const advance = parseFloat(item.AdvancePayment) || 0;
      const other = parseFloat(item.OtherDeduction) || 0;
      const deductions = parseFloat(item.Deductions) || 0;
      const totalDeductions = (base * 0.08) + (base * 0.015) + (base * 0.01) + (deductions * 0.5) + advance + other;
      const net = base + bonus + allowance - totalDeductions;
      wsData.push([item.SalaryID, item.EmployeeID, item.FullName, base, bonus, allowance, totalDeductions, net]);
    });
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Payroll');
    XLSX.writeFile(wb, `payroll_${selectedMonth}_${selectedYear}.xlsx`);
  };

  const exportEmployeeDetailExcel = (emp) => {
    if (!emp) return;
    if (!(userRole === 'admin' || userRole === 'manager' || (userRole === 'employee' && String(emp.EmployeeID) === String(currentUserId)))) return;
    const base = parseFloat(emp.BaseSalary) || 0;
    const bonus = parseFloat(emp.Bonus) || 0;
    const allowance = parseFloat(emp.AllowanceResponsibility) || 0;
    const advance = parseFloat(emp.AdvancePayment) || 0;
    const other = parseFloat(emp.OtherDeduction) || 0;
    const deductions = parseFloat(emp.Deductions) || 0;
    const social = base * 0.08;
    const health = base * 0.015;
    const unemp = base * 0.01;
    const personalTax = deductions * 0.5;
    const totalIncome = base + bonus + allowance;
    const totalDed = social + health + unemp + personalTax + advance + other;
    const net = totalIncome - totalDed;

    const wsData = [
      [`Bảng Lương Chi Tiết - ${emp.FullName} (${emp.EmployeeID || ''})`],
      [],
      ['Chi Tiết','Số Tiền (VND)'],
      ['I. Tổng Thu Nhập', totalIncome],
      ['Lương cơ bản', base],
      ['Phụ cấp trách nhiệm', allowance],
      ['Thưởng', bonus],
      [],
      ['II. Các khoản trừ',''],
      ['BHXH (8%)', social],
      ['BHYT (1.5%)', health],
      ['BHTN (1%)', unemp],
      ['Thuế TNCN (tạm tính)', personalTax],
      ['Tạm ứng', advance],
      ['Khác', other],
      [],
      ['III. Thực Nhận', net]
    ];
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    XLSX.utils.book_append_sheet(wb, ws, 'Detail');
    XLSX.writeFile(wb, `payroll_detail_${emp.EmployeeID || emp.SalaryID || 'unknown'}_${selectedMonth}_${selectedYear}.xlsx`);
    setContextMenu(null);
  };

  const handleCloseMenu = () => setContextMenu(null);
  const startEditing = () => setIsEditing(true);

  // Component Form cập nhật lương
  const UpdateSalaryForm = () => {
    const reasons = ['Tăng lương định kỳ', 'Thăng chức', 'Điều chỉnh theo luật', 'Chuyển phòng ban', 'Khác'];
    const newSalaryInputRef = useRef(null);

    const localCalculateProrate = async () => {
      const effectiveDate = updateFormData.effectiveDate;
      if (!effectiveDate) { alert('Vui lòng chọn ngày áp dụng!'); return; }
      const newSalaryNum = parseFloat(newSalaryInputRef.current?.value || updateFormData.newSalary || '0') || 0;
      if (newSalaryNum === (selectedEmployee?.BaseSalary || 0)) { alert('Lương mới không thay đổi so với lương hiện tại!'); return; }
      setUpdating(true);
      try {
        const response = await calculateProrate({ old_salary: selectedEmployee?.BaseSalary || 0, new_salary: newSalaryNum, effective_date: effectiveDate });
        if (response.data.success) setCalculation(response.data.calculation);
        else alert('Không thể tính toán prorate!');
      } catch (err) { console.error('Lỗi tính prorate:', err); alert(`Lỗi: ${err.response?.data?.error || err.message}`); }
      finally { setUpdating(false); }
    };

    const localSaveUpdateSalary = async () => {
      const newSalaryNum = parseFloat(newSalaryInputRef.current?.value || updateFormData.newSalary || '0') || 0;
      if (newSalaryNum === (selectedEmployee?.BaseSalary || 0)) { alert('Lương mới không thay đổi so với lương hiện tại!'); return; }
      const confirmUpdate = window.confirm(
        `Xác nhận cập nhật lương cho ${selectedEmployee?.FullName}?\n\n` +
        `📊 Lương cũ: ${formatMoney(selectedEmployee?.BaseSalary)}\n` +
        `📈 Lương mới: ${formatMoney(newSalaryNum)}\n` +
        `📅 Áp dụng từ: ${updateFormData.effectiveDate}\n` +
        `📝 Lý do: ${updateFormData.reason}\n\n` +
        `⚠️ Lưu ý: Hành động này sẽ tạo lịch sử lương và áp dụng cho các kỳ lương tương lai.`
      );
      if (!confirmUpdate) return;
      setUpdating(true);
      try {
        const response = await updateSalaryHistory({ employee_id: selectedEmployee.EmployeeID, new_salary: newSalaryNum, effective_date: updateFormData.effectiveDate, reason: updateFormData.reason, created_by: localStorage.getItem('user_id') || 1 });
        if (response.data.success) {
          alert(response.data.message);
          const refreshResponse = await getPayrollList(selectedMonth, selectedYear);
          setPayrollData(refreshResponse.data);
          setShowUpdateSalaryForm(false);
          setCalculation(null);
        }
      } catch (err) { console.error('Lỗi cập nhật lương:', err); alert(`Lỗi: ${err.response?.data?.error || err.message}`); }
      finally { setUpdating(false); }
    };

    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex justify-between items-center mb-6 border-b pb-4">
          <h2 className="text-2xl font-bold text-blue-900">✏️ Cập nhật lương</h2>
          <button 
            onClick={handleCloseUpdateSalaryForm}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Thông tin nhân viên */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
          <p className="text-sm text-gray-500">Nhân viên</p>
          <p className="text-xl font-semibold text-gray-800">{selectedEmployee?.FullName}</p>
          <p className="text-sm text-gray-500 mt-1">Mã NV: {selectedEmployee?.EmployeeID}</p>
        </div>

        {/* Lương hiện tại */}
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-gray-500">Lương hiện tại</p>
          <p className="text-2xl font-bold text-blue-700">{formatMoney(selectedEmployee?.BaseSalary)}</p>
        </div>

        {/* Lương mới */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Lương mới <span className="text-red-500">*</span>
          </label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                ref={newSalaryInputRef}
                defaultValue={updateFormData.newSalary}
                onInput={(e) => { e.target.value = e.target.value.replace(/\D/g, ''); setCalculation(null); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                placeholder="Nhập số tiền"
              />
              <span className="absolute right-3 top-2 text-gray-400">₫</span>
            </div>
        </div>

        {/* Ngày hiệu lực */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Ngày áp dụng <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={updateFormData.effectiveDate}
            onChange={(e) => {
              setUpdateFormData({...updateFormData, effectiveDate: e.target.value});
              setCalculation(null);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-xs text-gray-400 mt-1">Lương mới sẽ áp dụng từ ngày này (prorate nếu giữa tháng)</p>
        </div>

        {/* Lý do */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">Lý do điều chỉnh</label>
          <select
            value={updateFormData.reason}
            onChange={(e) => setUpdateFormData({...updateFormData, reason: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            {reasons.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        {/* Nút xem trước */}
        {parseFloat((newSalaryInputRef?.current?.value) || updateFormData.newSalary || '0') !== (selectedEmployee?.BaseSalary || 0) && updateFormData.effectiveDate && (
          <div className="mb-4">
            <button
              type="button"
              onClick={localCalculateProrate}
              disabled={updating}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
            >
              {updating ? 'Đang tính...' : '📊 Xem trước cách tính lương'}
            </button>
          </div>
        )}

        {/* Kết quả prorate */}
        {calculation && (
          <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <p className="font-semibold text-yellow-800 mb-2">📐 Cách tính lương tháng:</p>
            <div className="space-y-1 text-sm">
              <p>Số ngày trong tháng: <strong>{calculation.days_in_month} ngày</strong></p>
              <p>Ngày trước khi áp dụng (lương cũ): <strong>{calculation.days_before_effective} ngày</strong></p>
              <p>Ngày sau khi áp dụng (lương mới): <strong>{calculation.days_after_effective} ngày</strong></p>
              <div className="border-t border-yellow-200 my-2 pt-2">
                <p className="font-bold">Lương prorate: <span className="text-green-600">{formatMoney(calculation.prorated_salary)}</span></p>
                <p className="text-xs text-gray-500">
                  ({formatMoney(calculation.daily_rate_old)} x {calculation.days_before_effective}) + ({formatMoney(calculation.daily_rate_new)} x {calculation.days_after_effective})
                </p>
                <p>Trừ bảo hiểm (10.5%): <span className="text-red-600">-{formatMoney(calculation.total_insurance)}</span></p>
                <p className="font-bold text-blue-600 mt-2">Thực nhận: {formatMoney(calculation.net_salary)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Thông báo */}
        <div className="mb-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
          <strong>ℹ️ Lưu ý:</strong><br />
          • Lương cũ sẽ được lưu vào lịch sử<br />
          • Nếu ngày áp dụng giữa tháng, hệ thống sẽ tự tính prorate
        </div>

        {/* Nút hành động */}
        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={handleCloseUpdateSalaryForm}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Hủy
          </button>
          <button
            onClick={localSaveUpdateSalary}
            disabled={updating}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {updating ? 'Đang xử lý...' : '💰 Cập nhật lương'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md relative" onClick={handleCloseMenu}>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          {viewingDetail && (
            <button onClick={handleBackFromDetail}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-semibold">
              ← Quay Lại
            </button>
          )}
          {showUpdateSalaryForm && (
            <button onClick={handleCloseUpdateSalaryForm} className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-semibold">
              ← Quay Lại
            </button>
          )}
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold text-blue-900">
              {viewingDetail ? `Bảng Lương Chi Tiết - ${employeeDetails?.FullName}` : 
               showUpdateSalaryForm ? `Cập nhật lương - ${selectedEmployee?.FullName}` :
               `Bảng Lương Tháng ${selectedMonth}/${selectedYear}`}
            </h2>
          </div>
          {viewingDetail && canEditSalary() && isEditing && (
            <div className="ml-4 px-3 py-1 bg-green-100 border border-green-400 text-green-800 rounded text-sm font-medium">
              ✏️ Chế độ chỉnh sửa
            </div>
          )}
        </div>
      </div>

      {!viewingDetail && !viewingAttendance && !showUpdateSalaryForm && (
        <div className="flex items-end gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-500">Tháng</label>
            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded">
              {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                <option key={m} value={m}>Tháng {m}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-500">Năm</label>
            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded">
              {[2023, 2024, 2025, 2026].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        {showUpdateSalaryForm ? (
          <UpdateSalaryForm />
        ) : viewingAttendance && attendanceEmployeeId ? (
          <AttendanceDetail
            employeeId={attendanceEmployeeId}
            month={selectedMonth}
            year={selectedYear}
            onClose={() => { setViewingAttendance(false); setAttendanceEmployeeId(null); }}
          />
        ) : viewingDetail && employeeDetails ? (
          <>
            {canEditSalary() && (
              <div className="flex justify-end gap-3 mb-4">
                {!isEditing ? (
                  <button onClick={startEditing} className="px-5 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-semibold flex items-center gap-2">
                    ✏️ Sửa lương
                  </button>
                ) : (
                  <>
                    <button onClick={handleCancelEdit} className="px-5 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition font-semibold">
                      Hủy
                    </button>
                    <button onClick={handleSaveSalary} className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold flex items-center gap-2">
                      💾 Lưu thay đổi
                    </button>
                  </>
                )}
              </div>
            )}

            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-3 text-left w-12">STT</th>
                  <th className="border p-3 text-left flex-1">Chi Tiết</th>
                  <th className="border p-3 text-right w-32">Số Tiền (VNĐ)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b-2 border-gray-300 bg-blue-50">
                  <td colSpan="3" className="p-3 font-bold text-blue-900 text-base">I. THU NHẬP</td>
                </tr>
                <tr className="border-b bg-white">
                  <td className="p-3 border text-center">  </td>
                  <td className="p-3 border font-semibold text-gray-700">Tổng Thu Nhập</td>
                  <td className="p-3 border text-right font-bold text-green-600">{formatMoney(getTotalIncome())}</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">1</td>
                  <td className="p-3 border text-gray-600">Lương cơ bản/Lương chính</td>
                  <td className="p-3 border text-right">
                    {isEditing ? (
                      <input type="number" value={editableFields.baseSalary} onChange={(e) => handleFieldChange('baseSalary', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-right" min="0" step="1000" />
                    ) : (formatMoney(employeeDetails.BaseSalary))}
                  </td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">2</td>
                  <td className="p-3 border text-gray-600">Phụ cấp trách nhiệm/chức vụ</td>
                  <td className="p-3 border text-right">
                    {isEditing ? (
                      <input type="number" value={editableFields.allowance} onChange={(e) => handleFieldChange('allowance', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-right" min="0" step="1000" />
                    ) : (formatMoney(employeeDetails.AllowanceResponsibility || 0))}
                  </td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">3</td>
                  <td className="p-3 border text-gray-600">Phụ cấp cơm trưa/xăng xe/điện thoại</td>
                  <td className="p-3 border text-right">0</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">4</td>
                  <td className="p-3 border text-gray-600">Lương làm thêm giờ (OT)</td>
                  <td className="p-3 border text-right">0</td>
                </tr>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">5</td>
                  <td className="p-3 border text-gray-600">Thưởng KPI/doanh số</td>
                  <td className="p-3 border text-right font-semibold">
                    {isEditing ? (
                      <input type="number" value={editableFields.bonus} onChange={(e) => handleFieldChange('bonus', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-right" min="0" step="1000" />
                    ) : (formatMoney(employeeDetails.Bonus))}
                  </td>
                </tr>

                <tr className="border-b-2 border-gray-300 bg-blue-50">
                  <td colSpan="3" className="p-3 font-bold text-blue-900 text-base">II. CÁC KHOẢN TRỪ</td>
                </tr>
                <tr className="border-b bg-white">
                  <td className="p-3 border text-center">  </td>
                  <td className="p-3 border font-semibold text-gray-700">Tổng Khấu Trừ</td>
                  <td className="p-3 border text-right font-bold text-red-600">{formatMoney(calculateTotalDeductions())}</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">1</td>
                  <td className="p-3 border text-gray-600">BHXH (8% lương)</td>
                  <td className="p-3 border text-right text-red-600">{formatMoney(calculateSocialIns())}</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">2</td>
                  <td className="p-3 border text-gray-600">BHYT (1.5% lương)</td>
                  <td className="p-3 border text-right text-red-600">{formatMoney(calculateHealthIns())}</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">3</td>
                  <td className="p-3 border text-gray-600">BHTN (1% lương)</td>
                  <td className="p-3 border text-right text-red-600">{formatMoney(calculateUnempIns())}</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">4</td>
                  <td className="p-3 border text-gray-600">Thuế TNCN (tạm tính)</td>
                  <td className="p-3 border text-right text-red-600">{formatMoney(calculatePersonalTax())}</td>
                </tr>
                <tr className="border-b bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">5</td>
                  <td className="p-3 border text-gray-600">Tạm ứng (nếu có)</td>
                  <td className="p-3 border text-right text-red-600">
                    {isEditing ? (
                      <input type="number" value={editableFields.advance} onChange={(e) => handleFieldChange('advance', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-right" min="0" step="1000" />
                    ) : (formatMoney(employeeDetails.AdvancePayment || 0))}
                  </td>
                </tr>
                <tr className="border-b-2 border-gray-300 bg-gray-50">
                  <td className="p-3 border text-center text-gray-600">6</td>
                  <td className="p-3 border text-gray-600">Khác (Khấu trừ khác)</td>
                  <td className="p-3 border text-right text-red-600">
                    {isEditing ? (
                      <input type="number" value={editableFields.other} onChange={(e) => handleFieldChange('other', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-right" min="0" step="1000" />
                    ) : (formatMoney(employeeDetails.OtherDeduction || 0))}
                  </td>
                </tr>

                <tr className="bg-blue-100 font-bold border-t-2 border-blue-500">
                  <td className="p-3 border text-center">  </td>
                  <td className="p-3 border text-gray-900">III. THỰC NHẬN</td>
                  <td className="p-3 border text-right text-blue-900 text-lg">{formatMoney(getNetSalary())}</td>
                </tr>
                <tr className="text-xs text-gray-500 bg-gray-50">
                  <td colSpan="3" className="p-2 text-center italic font-medium">Thực Nhận = I - II</td>
                </tr>
              </tbody>
            </table>
            
            <div className="flex justify-end mt-6">
              {(userRole === 'admin' || userRole === 'manager' || userRole === 'employee') && (
                <button onClick={() => exportEmployeeDetailExcel(employeeDetails)} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold">
                  Xuất Excel
                </button>
              )}
            </div>
          </>
        ) : (
          <>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 border text-left">Mã Lương</th>
                  <th className="p-3 border text-left">Họ Tên Nhân Viên</th>
                  <th className="p-3 border text-right">Lương Cơ Bản</th>
                  <th className="p-3 border text-right">Thưởng</th>
                  <th className="p-3 border text-right">Khấu Trừ</th>
                  <th className="p-3 border text-right font-bold">Thực Lãnh</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan="6" className="p-10 text-center text-gray-400">Đang tải dữ liệu lương...</td></tr>
                ) : displayPayrollData.length > 0 ? (
                  displayPayrollData.map((item, index) => {
                    const base = parseFloat(item.BaseSalary) || 0;
                    const bonus = parseFloat(item.Bonus) || 0;
                    const allowance = parseFloat(item.AllowanceResponsibility) || 0;
                    const advance = parseFloat(item.AdvancePayment) || 0;
                    const other = parseFloat(item.OtherDeduction) || 0;
                    const deductions = parseFloat(item.Deductions) || 0;
                    const totalDeductions = (base * 0.08) + (base * 0.015) + (base * 0.01) + (deductions * 0.5) + advance + other;
                    const net = base + bonus + allowance - totalDeductions;
                    return (
                      <tr key={item.SalaryID || index} className="border-b hover:bg-blue-50 transition cursor-pointer"
                        onContextMenu={(e) => handleContextMenu(e, item)} onDoubleClick={() => handleDoubleClick(item)}>
                        <td className="p-3 border text-center font-medium text-gray-600">#{item.SalaryID}</td>
                        <td className="p-3 border font-semibold">{item.FullName}</td>
                        <td className="p-3 border text-right">{formatMoney(base)}</td>
                        <td className="p-3 border text-right text-green-600">+{formatMoney(bonus + allowance)}</td>
                        <td className="p-3 border text-right text-red-600">-{formatMoney(totalDeductions)}</td>
                        <td className="p-3 border text-right font-bold text-blue-700 bg-blue-50">{formatMoney(net)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="6" className="p-10 text-center text-gray-400 italic">Chưa có dữ liệu bảng lương...</td></tr>
                )}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div className="fixed bg-white border border-gray-300 rounded-lg shadow-lg z-50"
          style={{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }} onClick={(e) => e.stopPropagation()}>
          {userRole === 'employee' ? (
            <>
              <button onClick={handleViewDetails} className="block w-full text-left px-4 py-2 hover:bg-blue-100 transition text-gray-700 font-medium">
                👁️ Xem chi tiết lương
              </button>
              <button onClick={handleViewAttendance} className="block w-full text-left px-4 py-2 hover:bg-blue-100 transition text-gray-700 font-medium border-t">
                📋 Xem chấm công
              </button>
            </>
          ) : (
            <>
              <button onClick={handleViewDetails} className="block w-full text-left px-4 py-2 hover:bg-blue-100 transition text-gray-700 font-medium">
                👁️ Xem chi tiết lương
              </button>
              <button onClick={handleViewAttendance} className="block w-full text-left px-4 py-2 hover:bg-blue-100 transition text-gray-700 font-medium border-t">
                📋 Xem chấm công
              </button>
              <button onClick={handleOpenUpdateSalary} className="block w-full text-left px-4 py-2 hover:bg-blue-100 transition text-gray-700 font-medium border-t">
                ✏️ Cập nhật lương
              </button>
            </>
          )}
        </div>
      )}

      {/* Nút Cập Nhập và Xuất (chỉ cho Admin/Manager) */}
      {!viewingDetail && !viewingAttendance && !showUpdateSalaryForm && (userRole === 'admin' || userRole === 'manager') && (
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={handleUpdatePayroll} className="px-6 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition font-semibold">
            Cập Nhập
          </button>
          <button onClick={exportPayrollListExcel} className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition font-semibold">
            Xuất Excel
          </button>
        </div>
      )}
    </div>
  );
};

export default Payroll;
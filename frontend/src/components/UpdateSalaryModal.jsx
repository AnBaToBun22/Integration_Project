// frontend/src/components/UpdateSalaryModal.jsx
import React, { useState, useEffect } from 'react';
import { useRef } from 'react';
import { calculateProrate, updateSalaryHistory } from '../services/api';

const UpdateSalaryModal = ({ employee, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    newSalary: '',
    effectiveDate: new Date().toISOString().split('T')[0],
    reason: 'Tăng lương định kỳ'
  });
  const [loading, setLoading] = useState(false);
  const [calculation, setCalculation] = useState(null);
  const newSalaryRef = useRef(null);
  const renderId = React.useRef(0);
  renderId.current += 1;
  console.debug(`[UpdateSalaryModal] render #${renderId.current}`, { employeeId: employee?.EmployeeID, formData });

  useEffect(() => {
    // initialize/reset form when employee changes
    if (employee) {
      setFormData(prev => ({
        ...prev,
        newSalary: employee.BaseSalary != null ? String(employee.BaseSalary) : ''
      }));
      setCalculation(null);
    }
  }, [employee?.EmployeeID]);

  const reasons = [
    'Tăng lương định kỳ',
    'Thăng chức',
    'Điều chỉnh theo luật',
    'Chuyển phòng ban',
    'Khác'
  ];

  const formatMoney = (amount) => {
    if (!amount && amount !== 0) return '0 ₫';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
  };

  // Tính toán prorate trước khi lưu
  const calculateProrateData = async () => {
    if (!formData.effectiveDate) {
      alert('Vui lòng chọn ngày áp dụng!');
      return;
    }
    const newSalaryNum = parseFloat((newSalaryRef.current?.value) || formData.newSalary || '0') || 0;
    if (newSalaryNum === (employee?.BaseSalary || 0)) {
      alert('Lương mới không thay đổi so với lương hiện tại!');
      return;
    }

    setLoading(true);
    try {
      const response = await calculateProrate({
        old_salary: employee?.BaseSalary || 0,
        new_salary: newSalaryNum,
        effective_date: formData.effectiveDate
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
      setLoading(false);
    }
  };

  const defaultEffectiveDate = new Date().toISOString().split('T')[0];

  const isDirty = () => {
    if (!employee) return false;
    return (
      (parseFloat(formData.newSalary || '0') !== (employee.BaseSalary || 0)) ||
      (formData.effectiveDate !== defaultEffectiveDate) ||
      (formData.reason !== 'Tăng lương định kỳ') ||
      (calculation !== null)
    );
  };

  const handleRequestClose = () => {
    if (isDirty()) {
      const confirmCancel = window.confirm('Bạn có chắc muốn hủy? Tất cả thay đổi sẽ bị mất.');
      if (!confirmCancel) return;
    }
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newSalaryNum = parseFloat((newSalaryRef.current?.value) || formData.newSalary || '0') || 0;
    if (newSalaryNum === (employee?.BaseSalary || 0)) {
      alert('Lương mới không thay đổi so với lương hiện tại!');
      return;
    }

    const confirmUpdate = window.confirm(
      `Xác nhận cập nhật lương cho ${employee?.FullName}?\n\n` +
      `📊 Lương cũ: ${formatMoney(employee?.BaseSalary)}\n` +
      `📈 Lương mới: ${formatMoney(newSalaryNum)}\n` +
      `📅 Áp dụng từ: ${formData.effectiveDate}\n` +
      `📝 Lý do: ${formData.reason}\n\n` +
      `⚠️ Lưu ý: Hành động này sẽ tạo lịch sử lương và áp dụng cho các kỳ lương tương lai.`
    );
    
    if (!confirmUpdate) return;
    
    setLoading(true);
    try {
      const response = await updateSalaryHistory({
        employee_id: employee.EmployeeID,
        new_salary: newSalaryNum,
        effective_date: formData.effectiveDate,
        reason: formData.reason,
        created_by: localStorage.getItem('user_id') || 1
      });
      
      if (response.data.success) {
        alert(response.data.message);
        if (onSuccess) onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Lỗi cập nhật lương:', error);
      alert(`Lỗi: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-bold text-blue-900">✏️ Cập nhật lương</h2>
          <button onClick={handleRequestClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Thông tin nhân viên */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg border">
            <p className="text-sm text-gray-500">Nhân viên</p>
            <p className="text-lg font-semibold text-gray-800">{employee?.FullName}</p>
            <p className="text-sm text-gray-500 mt-2">Mã NV: {employee?.EmployeeID}</p>
          </div>

          {/* Lương hiện tại */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <label className="block text-sm text-gray-500">Lương hiện tại</label>
            <div className="text-2xl font-bold text-blue-700">{formatMoney(employee?.BaseSalary)}</div>
          </div>

          {/* Lương mới */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Lương mới <span className="text-red-500">*</span></label>
            <div className="relative">
              <input
                type="text"
                inputMode="numeric"
                ref={newSalaryRef}
                defaultValue={formData.newSalary}
                onFocus={() => console.debug('[UpdateSalaryModal] input focus')}
                onBlur={() => console.debug('[UpdateSalaryModal] input blur')}
                onInput={(e) => {
                  // clean non-digits but don't trigger React state updates per keystroke
                  const cleaned = e.target.value.replace(/\D/g, '');
                  if (e.target.value !== cleaned) e.target.value = cleaned;
                  // clear calculation preview when user types
                  setCalculation(null);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                required
                placeholder="Nhập số tiền"
              />
              <span className="absolute right-3 top-2 text-gray-400">₫</span>
            </div>
            <div className="text-xs text-gray-400 mt-1">Nhập mức lương mới (VNĐ)</div>
          </div>

          {/* Ngày hiệu lực */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngày áp dụng <span className="text-red-500">*</span></label>
            <input
              type="date"
              value={formData.effectiveDate}
              onChange={(e) => { setFormData({...formData, effectiveDate: e.target.value}); setCalculation(null); }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              required
            />
            <div className="text-xs text-gray-400 mt-1">Lương mới sẽ áp dụng từ ngày này (prorate nếu giữa tháng)</div>
          </div>

          {/* Lý do */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Lý do điều chỉnh</label>
            <select
              value={formData.reason}
              onChange={(e) => setFormData({...formData, reason: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {reasons.map(r => (<option key={r} value={r}>{r}</option>))}
            </select>
          </div>

          {/* Nút xem trước prorate */}
          {parseFloat(formData.newSalary || '0') !== (employee?.BaseSalary || 0) && formData.effectiveDate && (
            <div className="mb-4">
              <button type="button" onClick={calculateProrateData} disabled={loading}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition disabled:opacity-50">
                {loading ? 'Đang tính...' : '📊 Xem trước cách tính lương'}
              </button>
            </div>
          )}

          {/* Kết quả prorate */}
          {calculation && (
            <div className="mb-4 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-semibold text-yellow-800 mb-2">📐 Cách tính lương tháng {formData.effectiveDate?.slice(5,7)}/{formData.effectiveDate?.slice(0,4)}:</p>
              <div className="space-y-1 text-sm">
                <p className="flex justify-between"><span>Số ngày trong tháng:</span><span className="font-semibold">{calculation.days_in_month} ngày</span></p>
                <p className="flex justify-between"><span>Ngày trước khi áp dụng (lương cũ):</span><span className="font-semibold">{calculation.days_before_effective} ngày</span></p>
                <p className="flex justify-between"><span>Ngày sau khi áp dụng (lương mới):</span><span className="font-semibold">{calculation.days_after_effective} ngày</span></p>
                <div className="border-t border-yellow-200 my-2 pt-2">
                  <p className="flex justify-between font-bold"><span>Lương prorate:</span><span className="text-green-600">{formatMoney(calculation.prorated_salary)}</span></p>
                  <p className="text-xs text-gray-500">({formatMoney(calculation.daily_rate_old)} x {calculation.days_before_effective}) + ({formatMoney(calculation.daily_rate_new)} x {calculation.days_after_effective})</p>
                  <p className="flex justify-between mt-2"><span>Trừ bảo hiểm (10.5%):</span><span className="text-red-600">-{formatMoney(calculation.total_insurance)}</span></p>
                  <p className="flex justify-between font-bold text-blue-600 mt-2"><span>Thực nhận:</span><span>{formatMoney(calculation.net_salary)}</span></p>
                </div>
              </div>
            </div>
          )}

          {/* Thông báo */}
          <div className="mb-4 p-3 bg-yellow-50 rounded-lg text-sm text-yellow-800">
            <strong>ℹ️ Lưu ý:</strong><br />
            • Lương cũ sẽ được lưu vào lịch sử<br />
            • Nếu ngày áp dụng giữa tháng, hệ thống sẽ tự tính prorate<br />
            • Nhân viên sẽ nhận được thông báo (nếu có cấu hình)
          </div>

          {/* Nút hành động */}
          <div className="flex justify-end gap-3 mt-6">
            <button type="button" onClick={handleRequestClose} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-2">
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Đang xử lý...
                </>
              ) : ('💰 Cập nhật lương')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UpdateSalaryModal;
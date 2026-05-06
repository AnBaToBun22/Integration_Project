import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Calendar, MapPin, Users, FileText, Send, Bell, Eye } from 'lucide-react';

const Events = () => {
  const [activeTab, setActiveTab] = useState('create');
  const [eventsList, setEventsList] = useState([]);
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    location: '',
    content: '',
    targetAudience: 'all'
  });
  const [message, setMessage] = useState('');
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Load danh sách sự kiện từ API
  useEffect(() => {
    if (activeTab === 'list') {
      const fetchEvents = async () => {
        try {
          const token = localStorage.getItem('token') || 'dummy-token';
          const response = await axios.get('http://localhost:5000/api/events', {
            headers: { Authorization: `Bearer ${token}` }
          });
          // Map DB columns to Frontend props
          const formattedEvents = response.data.map(e => ({
            id: e.EventID,
            title: e.Title,
            date: e.EventDate,
            location: e.Location,
            targetAudience: e.TargetAudience,
            content: e.Content
          }));
          setEventsList(formattedEvents);
        } catch (error) {
          console.error("Lỗi khi lấy sự kiện:", error);
        }
      };
      fetchEvents();
    }
  }, [activeTab]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.date || !formData.content) {
      setMessage({ type: 'error', text: 'Vui lòng nhập đầy đủ tiêu đề, thời gian và nội dung sự kiện.' });
      return;
    }

    try {
      const token = localStorage.getItem('token') || 'dummy-token';
      await axios.post('http://localhost:5000/api/events', formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessage({ type: 'success', text: 'Gửi thông báo thành công!' });
      setFormData({ title: '', date: '', location: '', content: '', targetAudience: 'all' });
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      const errorMsg = error.response?.data?.message || 'Có lỗi xảy ra khi gửi thông báo.';
      setMessage({ type: 'error', text: errorMsg });
    }
  };

  const handleViewEvent = (event) => {
    setSelectedEvent(event);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <Bell className="mr-2 text-blue-600" /> Quản lý thông báo sự kiện
        </h1>
        <div className="flex space-x-2">
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'create' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
            onClick={() => setActiveTab('create')}
          >
            Tạo thông báo mới
          </button>
          <button 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-600 border hover:bg-gray-50'}`}
            onClick={() => setActiveTab('list')}
          >
            Danh sách sự kiện
          </button>
        </div>
      </div>

      {message && (
        <div className={`p-4 mb-6 rounded-lg border ${message.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
          {message.text}
        </div>
      )}

      {activeTab === 'create' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Soạn thông báo sự kiện</h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tiêu đề sự kiện *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <FileText size={18} className="text-gray-400" />
                  </div>
                  <input type="text" name="title" value={formData.title} onChange={handleInputChange} className="pl-10 w-full border border-gray-300 rounded-lg py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="VD: Sinh nhật công ty..." />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Thời gian *</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Calendar size={18} className="text-gray-400" />
                  </div>
                  <input type="datetime-local" name="date" value={formData.date} onChange={handleInputChange} className="pl-10 w-full border border-gray-300 rounded-lg py-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa điểm</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MapPin size={18} className="text-gray-400" />
                  </div>
                  <input type="text" name="location" value={formData.location} onChange={handleInputChange} className="pl-10 w-full border border-gray-300 rounded-lg py-2 focus:ring-blue-500 focus:border-blue-500" placeholder="VD: Phòng họp A, Tầng 3" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Đối tượng nhận thông báo</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Users size={18} className="text-gray-400" />
                  </div>
                  <select name="targetAudience" value={formData.targetAudience} onChange={handleInputChange} className="pl-10 w-full border border-gray-300 rounded-lg py-2 focus:ring-blue-500 focus:border-blue-500 bg-white">
                    <option value="all">Toàn bộ nhân viên</option>
                    <option value="it">Phòng IT</option>
                    <option value="hr">Phòng Nhân sự</option>
                    <option value="sales">Phòng Kinh doanh</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nội dung chi tiết *</label>
              <textarea name="content" value={formData.content} onChange={handleInputChange} rows={5} className="w-full border border-gray-300 rounded-lg p-3 focus:ring-blue-500 focus:border-blue-500" placeholder="Nhập nội dung thông báo..."></textarea>
            </div>

            <div className="flex justify-end pt-4">
              <button type="button" onClick={() => setFormData({ title: '', date: '', location: '', content: '', targetAudience: 'all' })} className="px-5 py-2 mr-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                Làm mới
              </button>
              <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center transition-colors shadow-sm">
                <Send size={18} className="mr-2" /> Gửi thông báo
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'list' && !selectedEvent && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tiêu đề</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Thời gian</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Địa điểm</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đối tượng</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {eventsList.map((event) => (
                <tr key={event.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{event.title}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{event.location}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                      {event.targetAudience === 'all' ? 'Toàn bộ' : event.targetAudience.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleViewEvent(event)} className="text-blue-600 hover:text-blue-900 flex items-center justify-end w-full">
                      <Eye size={18} className="mr-1" /> Xem
                    </button>
                  </td>
                </tr>
              ))}
              {eventsList.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-10 text-center text-gray-500">Không có sự kiện nào</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'list' && selectedEvent && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 relative">
          <button 
            onClick={() => setSelectedEvent(null)}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 font-bold text-xl"
          >
            &times;
          </button>
          <h2 className="text-2xl font-bold text-gray-800 mb-6 pb-4 border-b">{selectedEvent.title}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg">
              <div className="bg-blue-100 p-2 rounded-full mr-3 text-blue-600">
                <Calendar size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Thời gian</p>
                <p className="font-medium">{selectedEvent.date}</p>
              </div>
            </div>
            <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg">
              <div className="bg-green-100 p-2 rounded-full mr-3 text-green-600">
                <MapPin size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Địa điểm</p>
                <p className="font-medium">{selectedEvent.location || 'Không có'}</p>
              </div>
            </div>
            <div className="flex items-center text-gray-700 bg-gray-50 p-3 rounded-lg">
              <div className="bg-purple-100 p-2 rounded-full mr-3 text-purple-600">
                <Users size={20} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase font-semibold">Đối tượng</p>
                <p className="font-medium">{selectedEvent.targetAudience === 'all' ? 'Toàn bộ nhân viên' : selectedEvent.targetAudience.toUpperCase()}</p>
              </div>
            </div>
          </div>
          
          <div className="prose max-w-none text-gray-700">
            <h3 className="text-lg font-semibold mb-2">Nội dung chi tiết</h3>
            <div className="bg-gray-50 p-5 rounded-lg border border-gray-100 whitespace-pre-wrap">
              {selectedEvent.content}
            </div>
          </div>
          
          <div className="mt-8 flex justify-center">
            <button 
              onClick={() => setSelectedEvent(null)}
              className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium transition-colors"
            >
              Quay lại danh sách
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;

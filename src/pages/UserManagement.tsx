import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, UserPlus, Edit2, Save, X } from 'lucide-react';
import { toast } from '../utils/toast';

interface Profile {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'manager' | 'admin';
  manager_id: string | null;
  created_at: string;
}

export const UserManagement: React.FC = () => {
  const navigate = useNavigate();
  const [users, setUsers] = useState<Profile[]>([]);
  const [managers, setManagers] = useState<Profile[]>([]);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editedValues, setEditedValues] = useState<Record<string, Partial<Profile>>>({});
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    name: '',
    role: 'employee' as 'employee' | 'manager' | 'admin',
    manager_id: '',
  });
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
      setManagers(data?.filter((u) => u.role === 'manager' || u.role === 'admin') || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (userId: string, user: Profile) => {
    setEditingUser(userId);
    setEditedValues({
      [userId]: {
        name: user.name,
        role: user.role,
        manager_id: user.manager_id,
      },
    });
  };

  const handleSaveEdit = async (userId: string) => {
    setProcessing(true);
    try {
      const values = editedValues[userId];
      
      // Validate: employees must have a manager
      if (values.role === 'employee' && !values.manager_id) {
        toast.error('Employees must have a manager assigned');
        setProcessing(false);
        return;
      }

      const { error } = await supabase
        .from('profiles')
        .update({
          name: values.name,
          role: values.role,
          manager_id: values.manager_id || null,
        })
        .eq('id', userId);

      if (error) throw error;

      toast.success('User updated successfully');
      setEditingUser(null);
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user');
    } finally {
      setProcessing(false);
    }
  };

  const handleInviteUser = async () => {
    if (!inviteData.email || !inviteData.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (inviteData.role === 'employee' && !inviteData.manager_id) {
      toast.error('Employees must have a manager assigned');
      return;
    }

    setProcessing(true);
    try {
      // Note: In production, you would use Supabase Admin API to create users
      // For demo purposes, we'll show instructions
      toast.info(
        `To invite ${inviteData.email}:\n1. Go to Supabase Dashboard > Authentication > Users\n2. Click "Invite User"\n3. Enter email: ${inviteData.email}\n4. User will receive invitation email`,
        { duration: 8000 }
      );

      // Create profile entry (in production, this would be done via trigger after user signup)
      // For now, we'll just close the modal
      setShowInviteModal(false);
      setInviteData({
        email: '',
        name: '',
        role: 'employee',
        manager_id: '',
      });
    } catch (err: any) {
      toast.error(err.message || 'Failed to invite user');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/admin')}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-6 w-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
            </div>
            <button
              onClick={() => setShowInviteModal(true)}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              <UserPlus className="h-5 w-5 mr-2" />
              Invite User
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <input
                        type="text"
                        value={editedValues[user.id]?.name || ''}
                        onChange={(e) =>
                          setEditedValues({
                            ...editedValues,
                            [user.id]: { ...editedValues[user.id], name: e.target.value },
                          })
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                    ) : (
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <select
                        value={editedValues[user.id]?.role || user.role}
                        onChange={(e) =>
                          setEditedValues({
                            ...editedValues,
                            [user.id]: {
                              ...editedValues[user.id],
                              role: e.target.value as 'employee' | 'manager' | 'admin',
                            },
                          })
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                      >
                        <option value="employee">Employee</option>
                        <option value="manager">Manager</option>
                        <option value="admin">Admin</option>
                      </select>
                    ) : (
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin'
                            ? 'bg-purple-100 text-purple-800'
                            : user.role === 'manager'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <select
                        value={editedValues[user.id]?.manager_id || ''}
                        onChange={(e) =>
                          setEditedValues({
                            ...editedValues,
                            [user.id]: { ...editedValues[user.id], manager_id: e.target.value },
                          })
                        }
                        className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        disabled={editedValues[user.id]?.role !== 'employee'}
                      >
                        <option value="">None</option>
                        {managers
                          .filter((m) => m.id !== user.id)
                          .map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <div className="text-sm text-gray-900">
                        {user.manager_id
                          ? managers.find((m) => m.id === user.manager_id)?.name || '-'
                          : '-'}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingUser === user.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingUser(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleSaveEdit(user.id)}
                          disabled={processing}
                          className="text-indigo-600 hover:text-indigo-900 disabled:opacity-50"
                        >
                          <Save className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => handleEditUser(user.id, user)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Invite New User</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input
                  type="email"
                  value={inviteData.email}
                  onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="user@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                <input
                  type="text"
                  value={inviteData.name}
                  onChange={(e) => setInviteData({ ...inviteData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                <select
                  value={inviteData.role}
                  onChange={(e) =>
                    setInviteData({
                      ...inviteData,
                      role: e.target.value as 'employee' | 'manager' | 'admin',
                    })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              {inviteData.role === 'employee' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager *
                  </label>
                  <select
                    value={inviteData.manager_id}
                    onChange={(e) => setInviteData({ ...inviteData, manager_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">Select manager</option>
                    {managers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end space-x-2">
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteData({ email: '', name: '', role: 'employee', manager_id: '' });
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleInviteUser}
                disabled={processing}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processing ? 'Inviting...' : 'Send Invitation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

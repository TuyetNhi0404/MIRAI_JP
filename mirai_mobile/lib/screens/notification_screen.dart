import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/notification_model.dart';
import 'package:intl/intl.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  final ApiService _apiService = ApiService();
  List<NotificationModel> _notifications = [];
  bool _isLoading = true;
  String _errorMessage = '';
  
  static const _red = Color(0xFFB90000);

  @override
  void initState() {
    super.initState();
    _fetchNotifications();
  }

  Future<void> _fetchNotifications() async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.accessToken;
      if (token == null) return;

      final data = await _apiService.fetchNotifications(token);
      if (mounted) {
        setState(() {
          _notifications = data.map((e) => NotificationModel.fromJson(e)).toList();
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _markAsRead(NotificationModel notification) async {
    if (notification.isRead) return;
    
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.accessToken;
      if (token == null) return;

      await _apiService.markNotificationAsRead(token, notification.id);
      
      if (mounted) {
        setState(() {
          final index = _notifications.indexWhere((n) => n.id == notification.id);
          if (index != -1) {
            _notifications[index] = NotificationModel(
              id: notification.id,
              title: notification.title,
              message: notification.message,
              type: notification.type,
              isRead: true,
              createdAt: notification.createdAt,
              courseId: notification.courseId,
              relatedEntityId: notification.relatedEntityId,
              relatedEntityType: notification.relatedEntityType,
            );
          }
        });
      }
    } catch (e) {
      // Silently handle error, maybe show a toast
    }
  }

  Future<void> _markAllAsRead() async {
    try {
      final authProvider = Provider.of<AuthProvider>(context, listen: false);
      final token = authProvider.accessToken;
      if (token == null) return;

      await _apiService.markAllNotificationsAsRead(token);
      
      if (mounted) {
        setState(() {
          for (var i = 0; i < _notifications.length; i++) {
            final n = _notifications[i];
            _notifications[i] = NotificationModel(
              id: n.id,
              title: n.title,
              message: n.message,
              type: n.type,
              isRead: true,
              createdAt: n.createdAt,
              courseId: n.courseId,
              relatedEntityId: n.relatedEntityId,
              relatedEntityType: n.relatedEntityType,
            );
          }
        });
      }
    } catch (e) {
      // Silently handle error
    }
  }

  String _formatDate(DateTime date) {
    return DateFormat('dd/MM/yyyy HH:mm').format(date);
  }

  IconData _getIconForType(String type) {
    switch (type) {
      case 'assignment_created':
      case 'assignment_deadline':
        return Icons.assignment_rounded;
      case 'enrollment_request':
      case 'enrollment_response':
        return Icons.group_add_rounded;
      case 'global_announcement':
        return Icons.campaign_rounded;
      default:
        return Icons.notifications_rounded;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      height: MediaQuery.of(context).size.height * 0.85,
      decoration: const BoxDecoration(
        color: Color(0xFFF5F5F5),
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Column(
        children: [
          // Drag handle
          Container(
            margin: const EdgeInsets.only(top: 12, bottom: 8),
            width: 40,
            height: 4,
            decoration: BoxDecoration(
              color: Colors.grey[300],
              borderRadius: BorderRadius.circular(2),
            ),
          ),
          // Header
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const SizedBox(width: 48), // Cân bằng cho icon bên phải
                const Text(
                  'Thông báo',
                  style: TextStyle(
                    color: _red,
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.done_all_rounded, color: _red),
                  tooltip: 'Đánh dấu tất cả đã đọc',
                  onPressed: _notifications.any((n) => !n.isRead) ? _markAllAsRead : null,
                ),
              ],
            ),
          ),
          // Body
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator(color: _red))
                : _errorMessage.isNotEmpty
                    ? Center(child: Text('Lỗi: $_errorMessage', style: const TextStyle(color: Colors.red)))
                    : _notifications.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.notifications_off_outlined, size: 64, color: Colors.black.withOpacity(0.2)),
                                const SizedBox(height: 16),
                                const Text('Không có thông báo nào.', style: TextStyle(color: Colors.black54, fontSize: 16)),
                              ],
                            ),
                          )
                        : RefreshIndicator(
                            color: _red,
                            onRefresh: _fetchNotifications,
                            child: ListView.builder(
                              padding: const EdgeInsets.all(16),
                              itemCount: _notifications.length,
                              itemBuilder: (context, index) {
                                final notification = _notifications[index];
                                return GestureDetector(
                                  onTap: () => _markAsRead(notification),
                                  child: Container(
                                    margin: const EdgeInsets.only(bottom: 12),
                                    padding: const EdgeInsets.all(16),
                                    decoration: BoxDecoration(
                                      color: notification.isRead ? Colors.white : const Color(0xFFFFEDED),
                                      borderRadius: BorderRadius.circular(16),
                                      border: Border.all(
                                        color: notification.isRead ? Colors.black.withOpacity(0.05) : _red.withOpacity(0.3),
                                      ),
                                      boxShadow: [
                                        BoxShadow(
                                          color: Colors.black.withOpacity(0.03),
                                          blurRadius: 10,
                                          offset: const Offset(0, 2),
                                        ),
                                      ],
                                    ),
                                    child: Row(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(10),
                                          decoration: BoxDecoration(
                                            color: notification.isRead ? Colors.black.withOpacity(0.05) : _red.withOpacity(0.1),
                                            shape: BoxShape.circle,
                                          ),
                                          child: Icon(
                                            _getIconForType(notification.type),
                                            color: notification.isRead ? Colors.black54 : _red,
                                            size: 24,
                                          ),
                                        ),
                                        const SizedBox(width: 16),
                                        Expanded(
                                          child: Column(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Text(
                                                notification.title,
                                                style: TextStyle(
                                                  color: const Color(0xFF1A1A1A),
                                                  fontSize: 15,
                                                  fontWeight: notification.isRead ? FontWeight.normal : FontWeight.bold,
                                                ),
                                              ),
                                              const SizedBox(height: 4),
                                              Text(
                                                notification.message,
                                                style: TextStyle(
                                                  color: Colors.black.withOpacity(0.6),
                                                  fontSize: 13,
                                                ),
                                              ),
                                              const SizedBox(height: 8),
                                              Text(
                                                _formatDate(notification.createdAt),
                                                style: const TextStyle(
                                                  color: Colors.black45,
                                                  fontSize: 11,
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                        if (!notification.isRead)
                                          Container(
                                            width: 10,
                                            height: 10,
                                            margin: const EdgeInsets.only(top: 8),
                                            decoration: const BoxDecoration(
                                              color: _red,
                                              shape: BoxShape.circle,
                                            ),
                                          ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
                          ),
          ),
        ],
      ),
    );
  }
}

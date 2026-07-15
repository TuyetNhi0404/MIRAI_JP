import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';

class AdminEnrollmentRequestsScreen extends StatefulWidget {
  const AdminEnrollmentRequestsScreen({super.key});

  @override
  State<AdminEnrollmentRequestsScreen> createState() => _AdminEnrollmentRequestsScreenState();
}

class _AdminEnrollmentRequestsScreenState extends State<AdminEnrollmentRequestsScreen> {
  final ApiService _apiService = ApiService();
  final TextEditingController _searchController = TextEditingController();
  
  List<Map<String, dynamic>> _enrollments = [];
  bool _isLoading = true;
  String _selectedStatus = 'pending'; // 'pending', 'approved', 'rejected', 'all'
  String _searchQuery = '';

  static const Color _red = Color(0xFFB90000);
  static const Color _navy = Color(0xFF023665);
  static const Color _background = Color(0xFFFAF8F5);

  @override
  void initState() {
    super.initState();
    _loadEnrollments();
    _searchController.addListener(() {
      setState(() {
        _searchQuery = _searchController.text;
      });
    });
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _loadEnrollments() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
    });

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;

    if (token == null) {
      setState(() {
        _isLoading = false;
      });
      return;
    }

    try {
      final statusParam = _selectedStatus == 'all' ? null : _selectedStatus;
      final data = await _apiService.fetchAllEnrollments(token, status: statusParam);
      
      if (mounted) {
        setState(() {
          _enrollments = data;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi tải danh sách đăng ký: ${e.toString()}'),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    }
  }

  List<Map<String, dynamic>> get _filteredEnrollments {
    if (_searchQuery.trim().isEmpty) return _enrollments;
    final query = _searchQuery.toLowerCase().trim();
    return _enrollments.where((e) {
      final name = e['studentName']?.toString().toLowerCase() ?? '';
      final email = e['studentEmail']?.toString().toLowerCase() ?? '';
      final course = e['courseId'] as Map<String, dynamic>?;
      final courseName = course != null ? (course['name']?.toString().toLowerCase() ?? '') : '';
      return name.contains(query) || email.contains(query) || courseName.contains(query);
    }).toList();
  }

  String _formatDate(String? dateStr) {
    if (dateStr == null) return 'N/A';
    final dt = DateTime.tryParse(dateStr);
    if (dt == null) return 'N/A';
    final day = dt.day.toString().padLeft(2, '0');
    final month = dt.month.toString().padLeft(2, '0');
    final year = dt.year;
    return '$day/$month/$year';
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'approved':
        return Colors.green[700]!;
      case 'rejected':
        return Colors.red[700]!;
      default:
        return Colors.orange[855] ?? Colors.orange[800]!;
    }
  }

  Color _getStatusBgColor(String status) {
    switch (status) {
      case 'approved':
        return Colors.green.withOpacity(0.08);
      case 'rejected':
        return Colors.red.withOpacity(0.08);
      default:
        return Colors.orange.withOpacity(0.08);
    }
  }

  String _getStatusLabel(String status) {
    switch (status) {
      case 'approved':
        return 'Đã phê duyệt';
      case 'rejected':
        return 'Đã từ chối';
      default:
        return 'Chờ duyệt';
    }
  }

  Future<void> _processEnrollmentAction(String enrollmentId, bool approve) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;

    try {
      if (approve) {
        await _apiService.approveEnrollment(token!, enrollmentId);
      } else {
        await _apiService.rejectEnrollment(token!, enrollmentId);
      }

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(approve ? 'Đã duyệt yêu cầu thành công!' : 'Đã từ chối yêu cầu đăng ký!'),
            backgroundColor: approve ? Colors.green[700] : Colors.orange[800],
          ),
        );
      }
      _loadEnrollments(); // Refresh
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi xử lý: ${e.toString()}'),
            backgroundColor: Colors.red[700],
          ),
        );
      }
    }
  }

  void _showDetailsBottomSheet(Map<String, dynamic> enrollment) {
    final course = enrollment['courseId'] as Map<String, dynamic>?;
    final courseName = course != null ? (course['name']?.toString() ?? 'Khóa học đã bị xóa') : 'N/A';
    final enrollmentId = enrollment['_id']?.toString() ?? '';
    final studentName = enrollment['studentName']?.toString() ?? 'N/A';
    final studentEmail = enrollment['studentEmail']?.toString() ?? 'N/A';
    final createdAt = enrollment['createdAt']?.toString();
    final status = enrollment['status']?.toString() ?? 'pending';

    showModalBottomSheet(
      context: context,
      backgroundColor: Colors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (context) {
        bool isProcessingLocal = false;

        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 24,
                right: 24,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Title / Close button
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Chi tiết đơn đăng ký',
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: _navy,
                        ),
                      ),
                      IconButton(
                        icon: const Icon(Icons.close, color: Colors.black54),
                        onPressed: () => Navigator.of(context).pop(),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  
                  // Status pill inside bottom sheet
                  Align(
                    alignment: Alignment.centerLeft,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                      decoration: BoxDecoration(
                        color: _getStatusBgColor(status),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: _getStatusColor(status).withOpacity(0.3)),
                      ),
                      child: Text(
                        _getStatusLabel(status),
                        style: TextStyle(
                          color: _getStatusColor(status),
                          fontWeight: FontWeight.bold,
                          fontSize: 12,
                        ),
                      ),
                    ),
                  ),
                  const Divider(color: Colors.black12, height: 24),
                  
                  // Details list
                  const Text('Khóa học', style: TextStyle(color: Colors.black45, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(
                    courseName,
                    style: const TextStyle(color: _navy, fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                  const SizedBox(height: 16),
                  
                  const Text('Họ và tên học viên', style: TextStyle(color: Colors.black45, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(
                    studentName,
                    style: const TextStyle(color: Color(0xFF1a1a1a), fontWeight: FontWeight.w600, fontSize: 15),
                  ),
                  const SizedBox(height: 16),

                  const Text('Địa chỉ Email', style: TextStyle(color: Colors.black45, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(
                    studentEmail,
                    style: const TextStyle(color: Color(0xFF1a1a1a), fontSize: 15),
                  ),
                  const SizedBox(height: 16),

                  const Text('Ngày đăng ký', style: TextStyle(color: Colors.black45, fontSize: 13, fontWeight: FontWeight.w500)),
                  const SizedBox(height: 4),
                  Text(
                    _formatDate(createdAt),
                    style: const TextStyle(color: Color(0xFF1a1a1a), fontSize: 15),
                  ),
                  const SizedBox(height: 28),

                  // Actions for pending
                  if (status == 'pending') ...[
                    if (isProcessingLocal)
                      const Center(
                        child: Padding(
                          padding: EdgeInsets.symmetric(vertical: 8.0),
                          child: CircularProgressIndicator(color: _red),
                        ),
                      )
                    else
                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton.icon(
                              onPressed: () async {
                                setModalState(() => isProcessingLocal = true);
                                await _processEnrollmentAction(enrollmentId, false);
                                if (context.mounted) Navigator.of(context).pop();
                              },
                              icon: const Icon(Icons.close_rounded, size: 18),
                              label: const Text('Từ chối'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: Colors.red[700],
                                side: BorderSide(color: Colors.red[400]!),
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: () async {
                                setModalState(() => isProcessingLocal = true);
                                await _processEnrollmentAction(enrollmentId, true);
                                if (context.mounted) Navigator.of(context).pop();
                              },
                              icon: const Icon(Icons.check_rounded, size: 18),
                              label: const Text('Phê duyệt'),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green[700],
                                foregroundColor: Colors.white,
                                elevation: 0,
                                padding: const EdgeInsets.symmetric(vertical: 12),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                            ),
                          ),
                        ],
                      ),
                  ] else ...[
                    ElevatedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.grey[200],
                        foregroundColor: Colors.black87,
                        elevation: 0,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                      ),
                      child: const Text('Đóng'),
                    ),
                  ],
                  const SizedBox(height: 12),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildStatusChip(String status, String label) {
    final isSelected = _selectedStatus == status;
    return GestureDetector(
      onTap: () {
        if (_selectedStatus != status) {
          setState(() {
            _selectedStatus = status;
          });
          _loadEnrollments();
        }
      },
      child: Container(
        margin: const EdgeInsets.only(right: 8),
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? _red : Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(
            color: isSelected ? _red : Colors.grey.withOpacity(0.25),
            width: 1.0,
          ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.02),
              blurRadius: 4,
              offset: const Offset(0, 1),
            ),
          ],
        ),
        child: Text(
          label,
          style: TextStyle(
            color: isSelected ? Colors.white : Colors.black87,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            fontSize: 13,
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredEnrollments;

    return Scaffold(
      backgroundColor: _background,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: _red, size: 20),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'YÊU CẦU GHI DANH',
          style: TextStyle(
            color: _navy,
            fontSize: 15,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(height: 1, color: _red.withOpacity(0.12)),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded, color: _red),
            onPressed: _loadEnrollments,
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadEnrollments,
          color: _red,
          backgroundColor: Colors.white,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Search Bar Card
                Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.withOpacity(0.2)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 10,
                        offset: const Offset(0, 2),
                      )
                    ],
                  ),
                  child: TextField(
                    controller: _searchController,
                    style: const TextStyle(color: Colors.black87, fontSize: 14),
                    decoration: InputDecoration(
                      hintText: 'Tìm theo tên, email, khóa học...',
                      hintStyle: TextStyle(color: Colors.grey.withOpacity(0.7), fontSize: 14),
                      prefixIcon: Icon(Icons.search, color: Colors.grey.withOpacity(0.7)),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, color: Colors.black54, size: 18),
                              onPressed: () => _searchController.clear(),
                            )
                          : null,
                      filled: true,
                      fillColor: Colors.transparent,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.circular(12),
                        borderSide: BorderSide.none,
                      ),
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // 2. Horizontal Scroll Status Filter Pills
                SizedBox(
                  height: 38,
                  child: ListView(
                    scrollDirection: Axis.horizontal,
                    children: [
                      _buildStatusChip('pending', 'Chờ duyệt'),
                      _buildStatusChip('approved', 'Đã duyệt'),
                      _buildStatusChip('rejected', 'Đã từ chối'),
                      _buildStatusChip('all', 'Tất cả'),
                    ],
                  ),
                ),
                const SizedBox(height: 14),

                // 3. Main content
                Expanded(
                  child: _isLoading
                      ? const Center(
                          child: CircularProgressIndicator(color: _red),
                        )
                      : filtered.isEmpty
                          ? ListView(
                              children: [
                                const SizedBox(height: 60),
                                Container(
                                  padding: const EdgeInsets.all(32),
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(color: Colors.grey.withOpacity(0.15)),
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        Icons.inbox_outlined,
                                        size: 48,
                                        color: Colors.grey.withOpacity(0.5),
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        'Không tìm thấy yêu cầu đăng ký nào!',
                                        style: TextStyle(
                                          color: Colors.grey[600],
                                          fontSize: 14,
                                          fontWeight: FontWeight.w500,
                                        ),
                                        textAlign: TextAlign.center,
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                            )
                          : ListView.separated(
                              itemCount: filtered.length,
                              separatorBuilder: (context, index) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final enrollment = filtered[index];
                                final studentName = enrollment['studentName']?.toString() ?? 'Không rõ';
                                final studentEmail = enrollment['studentEmail']?.toString() ?? 'N/A';
                                final status = enrollment['status']?.toString() ?? 'pending';
                                final createdAt = enrollment['createdAt']?.toString();
                                final course = enrollment['courseId'] as Map<String, dynamic>?;
                                final courseName = course != null ? (course['name']?.toString() ?? '') : 'Khóa học';

                                return Container(
                                  decoration: BoxDecoration(
                                    color: Colors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: Colors.grey.withOpacity(0.15)),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withOpacity(0.02),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      )
                                    ],
                                  ),
                                  child: Material(
                                    color: Colors.transparent,
                                    child: InkWell(
                                      borderRadius: BorderRadius.circular(16),
                                      onTap: () => _showDetailsBottomSheet(enrollment),
                                      child: Padding(
                                        padding: const EdgeInsets.all(16),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.stretch,
                                          children: [
                                            // Row: Avatar & Name
                                            Row(
                                              children: [
                                                CircleAvatar(
                                                  radius: 18,
                                                  backgroundColor: _red.withOpacity(0.08),
                                                  child: Text(
                                                    studentName.isNotEmpty ? studentName[0].toUpperCase() : 'U',
                                                    style: const TextStyle(
                                                      color: _red,
                                                      fontWeight: FontWeight.bold,
                                                      fontSize: 14,
                                                    ),
                                                  ),
                                                ),
                                                const SizedBox(width: 12),
                                                Expanded(
                                                  child: Column(
                                                    crossAxisAlignment: CrossAxisAlignment.start,
                                                    children: [
                                                      Text(
                                                        studentName,
                                                        style: const TextStyle(
                                                          color: Color(0xFF1a1a1a),
                                                          fontWeight: FontWeight.bold,
                                                          fontSize: 14.5,
                                                        ),
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                      const SizedBox(height: 2),
                                                      Text(
                                                        studentEmail,
                                                        style: TextStyle(
                                                          color: Colors.black.withOpacity(0.45),
                                                          fontSize: 12,
                                                        ),
                                                        overflow: TextOverflow.ellipsis,
                                                      ),
                                                    ],
                                                  ),
                                                ),
                                                // Status Pill Tag
                                                Container(
                                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                                  decoration: BoxDecoration(
                                                    color: _getStatusBgColor(status),
                                                    border: Border.all(color: _getStatusColor(status).withOpacity(0.3)),
                                                    borderRadius: BorderRadius.circular(6),
                                                  ),
                                                  child: Text(
                                                    _getStatusLabel(status),
                                                    style: TextStyle(
                                                      color: _getStatusColor(status),
                                                      fontWeight: FontWeight.bold,
                                                      fontSize: 10.5,
                                                    ),
                                                  ),
                                                ),
                                              ],
                                            ),
                                            const Divider(color: Colors.black12, height: 20),
                                            
                                            // Course and date details
                                            Row(
                                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                              children: [
                                                Expanded(
                                                  child: RichText(
                                                    overflow: TextOverflow.ellipsis,
                                                    text: TextSpan(
                                                      text: 'Khóa học: ',
                                                      style: TextStyle(color: Colors.black54, fontSize: 13),
                                                      children: [
                                                        TextSpan(
                                                          text: courseName,
                                                          style: const TextStyle(
                                                            color: _red,
                                                            fontWeight: FontWeight.bold,
                                                          ),
                                                        ),
                                                      ],
                                                    ),
                                                  ),
                                                ),
                                                Text(
                                                  _formatDate(createdAt),
                                                  style: TextStyle(
                                                    color: Colors.black.withOpacity(0.4),
                                                    fontSize: 12,
                                                  ),
                                                ),
                                              ],
                                            ),
                                            
                                            // Action buttons row if pending
                                            if (status == 'pending') ...[
                                              const SizedBox(height: 12),
                                              Row(
                                                mainAxisAlignment: MainAxisAlignment.end,
                                                children: [
                                                  TextButton(
                                                    onPressed: () => _processEnrollmentAction(enrollment['_id'], false),
                                                    style: TextButton.styleFrom(
                                                      foregroundColor: Colors.red[700],
                                                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                                    ),
                                                    child: const Text('Từ chối', style: TextStyle(fontWeight: FontWeight.bold)),
                                                  ),
                                                  const SizedBox(width: 12),
                                                  ElevatedButton(
                                                    onPressed: () => _processEnrollmentAction(enrollment['_id'], true),
                                                    style: ElevatedButton.styleFrom(
                                                      backgroundColor: Colors.green[700],
                                                      foregroundColor: Colors.white,
                                                      elevation: 0,
                                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                                                    ),
                                                    child: const Text('Phê duyệt', style: TextStyle(fontWeight: FontWeight.bold)),
                                                  ),
                                                ],
                                              ),
                                            ],
                                          ],
                                        ),
                                      ),
                                    ),
                                  ),
                                );
                              },
                            ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

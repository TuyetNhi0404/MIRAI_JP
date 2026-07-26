import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../config/design_tokens.dart';

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
            backgroundColor: AppColors.error,
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
            backgroundColor: approve ? AppColors.success : AppColors.warning,
          ),
        );
      }
      _loadEnrollments(); // Refresh
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Lỗi xử lý: ${e.toString()}'),
            backgroundColor: AppColors.error,
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

    Color statusColor;
    Color statusBgColor;
    String statusLabel;

    if (status == 'approved') {
      statusColor = AppColors.success;
      statusBgColor = AppColors.successBg;
      statusLabel = 'Đã phê duyệt';
    } else if (status == 'rejected') {
      statusColor = AppColors.error;
      statusBgColor = AppColors.errorBg;
      statusLabel = 'Đã từ chối';
    } else {
      statusColor = AppColors.warning;
      statusBgColor = AppColors.warningBg;
      statusLabel = 'Đang chờ duyệt';
    }

    showModalBottomSheet(
      context: context,
      backgroundColor: AppColors.white,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) {
        bool isProcessingLocal = false;

        return StatefulBuilder(
          builder: (context, setModalState) {
            return Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                  decoration: const BoxDecoration(
                    color: Color(0xFFF5F3EE),
                    borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Chi tiết đơn đăng ký',
                        style: TextStyle(
                          fontSize: 17,
                          fontWeight: FontWeight.bold,
                          color: Color(0xFF023665),
                        ),
                      ),
                      GestureDetector(
                        onTap: () => Navigator.of(context).pop(),
                        child: const Icon(Icons.close, color: Colors.black54),
                      ),
                    ],
                  ),
                ),
                Padding(
                  padding: EdgeInsets.only(
                    left: 20,
                    right: 20,
                    top: 16,
                    bottom: MediaQuery.of(context).viewInsets.bottom + 20,
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusBgColor,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: statusColor.withOpacity(0.2)),
                        ),
                        child: Text(
                          statusLabel,
                          style: TextStyle(
                            color: statusColor,
                            fontWeight: FontWeight.bold,
                            fontSize: 11,
                          ),
                        ),
                      ),
                      const SizedBox(height: 16),
                      
                      const Text('Khóa học', style: TextStyle(color: AppColors.textTertiary, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text(
                        courseName,
                        style: const TextStyle(color: AppColors.ink, fontWeight: FontWeight.bold, fontSize: 14.5),
                      ),
                      const SizedBox(height: 12),
                      const Divider(height: 1, thickness: 1, color: AppColors.border),
                      const SizedBox(height: 12),

                      const Text('Họ và tên', style: TextStyle(color: AppColors.textTertiary, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text(
                        studentName,
                        style: const TextStyle(color: AppColors.ink, fontSize: 14),
                      ),
                      const SizedBox(height: 12),
                      const Divider(height: 1, thickness: 1, color: AppColors.border),
                      const SizedBox(height: 12),

                      const Text('Email', style: TextStyle(color: AppColors.textTertiary, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text(
                        studentEmail,
                        style: const TextStyle(color: AppColors.ink, fontSize: 14),
                      ),
                      const SizedBox(height: 12),
                      const Divider(height: 1, thickness: 1, color: AppColors.border),
                      const SizedBox(height: 12),

                      const Text('Ngày đăng ký', style: TextStyle(color: AppColors.textTertiary, fontSize: 12)),
                      const SizedBox(height: 4),
                      Text(
                        _formatDate(createdAt),
                        style: const TextStyle(color: AppColors.ink, fontSize: 14),
                      ),
                      
                      const SizedBox(height: 24),
                      if (status == 'pending') ...[
                        if (isProcessingLocal)
                          const Center(
                            child: Padding(
                              padding: EdgeInsets.symmetric(vertical: 8.0),
                              child: CircularProgressIndicator(color: AppColors.primary),
                            ),
                          )
                        else
                          Row(
                            children: [
                              Expanded(
                                child: OutlinedButton(
                                  onPressed: () async {
                                    setModalState(() => isProcessingLocal = true);
                                    await _processEnrollmentAction(enrollmentId, false);
                                    if (context.mounted) Navigator.of(context).pop();
                                  },
                                  style: OutlinedButton.styleFrom(
                                    foregroundColor: AppColors.error,
                                    side: const BorderSide(color: AppColors.error),
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  child: const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.cancel_outlined, size: 18),
                                      SizedBox(width: 6),
                                      Text('Từ chối', style: TextStyle(fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                child: ElevatedButton(
                                  onPressed: () async {
                                    setModalState(() => isProcessingLocal = true);
                                    await _processEnrollmentAction(enrollmentId, true);
                                    if (context.mounted) Navigator.of(context).pop();
                                  },
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: AppColors.success,
                                    foregroundColor: AppColors.white,
                                    elevation: 0,
                                    padding: const EdgeInsets.symmetric(vertical: 12),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                  ),
                                  child: const Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(Icons.check_circle_outline, size: 18),
                                      SizedBox(width: 6),
                                      Text('Phê duyệt', style: TextStyle(fontWeight: FontWeight.bold)),
                                    ],
                                  ),
                                ),
                              ),
                            ],
                          ),
                      ] else ...[
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: () => Navigator.of(context).pop(),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFFF5F5F5),
                              foregroundColor: AppColors.textSecondary,
                              elevation: 0,
                              padding: const EdgeInsets.symmetric(vertical: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: const Text('Đóng'),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Widget _buildSegmentedFilter() {
    final statuses = ['pending', 'approved', 'rejected', 'all'];
    final labels = ['Chờ duyệt', 'Đã duyệt', 'Đã từ chối', 'Tất cả'];

    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: const Color(0xFFF0F0F0),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: List.generate(statuses.length, (index) {
          final status = statuses[index];
          final label = labels[index];
          final isSelected = _selectedStatus == status;

          return Expanded(
            child: GestureDetector(
              onTap: () {
                if (_selectedStatus != status) {
                  setState(() {
                    _selectedStatus = status;
                  });
                  _loadEnrollments();
                }
              },
              child: AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                padding: const EdgeInsets.symmetric(vertical: 8),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white : Colors.transparent,
                  borderRadius: BorderRadius.circular(8),
                  boxShadow: isSelected
                      ? [
                          BoxShadow(
                            color: Colors.black.withOpacity(0.05),
                            blurRadius: 4,
                            offset: const Offset(0, 2),
                          )
                        ]
                      : [],
                ),
                alignment: Alignment.center,
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                    color: isSelected ? AppColors.ink : AppColors.textSecondary,
                  ),
                ),
              ),
            ),
          );
        }),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _filteredEnrollments;

    return Scaffold(
      backgroundColor: const Color(0xFFF8F9FD),
      appBar: AppBar(
        backgroundColor: AppColors.ink,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: AppColors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Yêu cầu ghi danh',
          style: TextStyle(
            color: AppColors.white,
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: AppColors.white),
            onPressed: _loadEnrollments,
          ),
        ],
      ),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: _loadEnrollments,
          color: AppColors.primary,
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // 1. Search Bar Card
                Container(
                  decoration: BoxDecoration(
                    color: AppColors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: AppColors.border),
                    boxShadow: AppShadow.card,
                  ),
                  child: TextField(
                    controller: _searchController,
                    style: const TextStyle(fontSize: 14, color: AppColors.ink),
                    decoration: InputDecoration(
                      hintText: 'Tìm theo tên, email, khóa học...',
                      hintStyle: const TextStyle(color: AppColors.textTertiary, fontSize: 13),
                      prefixIcon: const Icon(Icons.search, color: AppColors.textSecondary, size: 20),
                      suffixIcon: _searchController.text.isNotEmpty
                          ? IconButton(
                              icon: const Icon(Icons.clear, color: AppColors.textSecondary, size: 18),
                              onPressed: () => _searchController.clear(),
                            )
                          : null,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(height: 14),

                // 2. Segmented status selector
                _buildSegmentedFilter(),
                const SizedBox(height: 14),

                // 3. Main list
                Expanded(
                  child: _isLoading
                      ? const Center(
                          child: CircularProgressIndicator(color: AppColors.primary),
                        )
                      : filtered.isEmpty
                          ? ListView(
                              children: [
                                const SizedBox(height: 60),
                                Container(
                                  padding: const EdgeInsets.all(32),
                                  decoration: BoxDecoration(
                                    color: AppColors.white,
                                    borderRadius: BorderRadius.circular(16),
                                    border: Border.all(color: AppColors.border),
                                    boxShadow: AppShadow.card,
                                  ),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(
                                        Icons.mail_outline_rounded,
                                        size: 48,
                                        color: AppColors.textTertiary,
                                      ),
                                      const SizedBox(height: 16),
                                      Text(
                                        'Không có đơn đăng ký nào chờ duyệt!',
                                        style: TextStyle(
                                          color: AppColors.textSecondary,
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
                          : ListView.builder(
                              itemCount: filtered.length,
                              itemBuilder: (context, index) {
                                final enrollment = filtered[index];
                                return _EnrollmentCard(
                                  enrollment: enrollment,
                                  onTap: () => _showDetailsBottomSheet(enrollment),
                                  onAction: (approve) => _processEnrollmentAction(enrollment['_id'], approve),
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

class _EnrollmentCard extends StatelessWidget {
  final Map<String, dynamic> enrollment;
  final VoidCallback onTap;
  final Function(bool approve) onAction;

  const _EnrollmentCard({
    required this.enrollment,
    required this.onTap,
    required this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final studentName = enrollment['studentName']?.toString() ?? 'Không rõ';
    final studentEmail = enrollment['studentEmail']?.toString() ?? 'N/A';
    final status = enrollment['status']?.toString() ?? 'pending';
    final createdAt = enrollment['createdAt']?.toString();
    
    final course = enrollment['courseId'] as Map<String, dynamic>?;
    final courseName = course != null ? (course['name']?.toString() ?? '') : 'Khóa học';
    final isDeleted = course == null;

    Color statusColor;
    Color statusBgColor;
    String statusLabel;

    if (status == 'approved') {
      statusColor = AppColors.success;
      statusBgColor = AppColors.successBg;
      statusLabel = 'Đã phê duyệt';
    } else if (status == 'rejected') {
      statusColor = AppColors.error;
      statusBgColor = AppColors.errorBg;
      statusLabel = 'Đã từ chối';
    } else {
      statusColor = AppColors.warning;
      statusBgColor = AppColors.warningBg;
      statusLabel = 'Chờ duyệt';
    }

    String formatDate(String? dateStr) {
      if (dateStr == null) return 'N/A';
      final dt = DateTime.tryParse(dateStr);
      if (dt == null) return 'N/A';
      return '${dt.day.toString().padLeft(2, '0')}/${dt.month.toString().padLeft(2, '0')}/${dt.year}';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: AppColors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.border),
        boxShadow: AppShadow.card,
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        child: Material(
          color: Colors.transparent,
          child: InkWell(
            onTap: onTap,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      CircleAvatar(
                        radius: 20,
                        backgroundColor: AppColors.primaryLight,
                        child: Text(
                          studentName.isNotEmpty ? studentName[0].toUpperCase() : 'U',
                          style: const TextStyle(
                            color: AppColors.primary,
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
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
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: AppColors.ink,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              studentEmail,
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: statusBgColor,
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(
                            color: statusColor.withOpacity(0.2),
                          ),
                        ),
                        child: Text(
                          statusLabel,
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: statusColor,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24, thickness: 1, color: AppColors.border),
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Khóa học:',
                              style: TextStyle(
                                fontSize: 11,
                                color: AppColors.textTertiary,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    courseName,
                                    style: const TextStyle(
                                      fontSize: 13,
                                      fontWeight: FontWeight.bold,
                                      color: AppColors.ink,
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                                if (isDeleted) ...[
                                  const SizedBox(width: 6),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: AppColors.errorBg,
                                      borderRadius: BorderRadius.circular(4),
                                    ),
                                    child: const Text(
                                      'Đã xóa',
                                      style: TextStyle(
                                        fontSize: 9,
                                        color: AppColors.error,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                  ),
                                ],
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 16),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          const Text(
                            'Ngày đăng ký:',
                            style: TextStyle(
                              fontSize: 11,
                              color: AppColors.textTertiary,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            formatDate(createdAt),
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w500,
                              color: AppColors.textSecondary,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                  if (status == 'pending') ...[
                    const SizedBox(height: 16),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.end,
                      children: [
                        TextButton(
                          onPressed: () => onAction(false),
                          style: TextButton.styleFrom(
                            foregroundColor: AppColors.error,
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          ),
                          child: const Text(
                            'Từ chối',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton(
                          onPressed: () => onAction(true),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: AppColors.success,
                            foregroundColor: AppColors.white,
                            elevation: 0,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                          ),
                          child: const Text(
                            'Phê duyệt',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

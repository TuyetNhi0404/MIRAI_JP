import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../models/submission_model.dart';
import '../providers/submission_provider.dart';
import '../providers/auth_provider.dart';

class SubmissionAssignmentScreen extends StatefulWidget {
  const SubmissionAssignmentScreen({super.key});

  @override
  State<SubmissionAssignmentScreen> createState() => _SubmissionAssignmentScreenState();
}

class _SubmissionAssignmentScreenState extends State<SubmissionAssignmentScreen> {
  final _searchController = TextEditingController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) => _load());
  }

  Future<void> _load() async {
    final auth = context.read<AuthProvider>();
    final subProvider = context.read<SubmissionProvider>();
    final token = auth.accessToken;
    if (token != null && mounted) {
      await subProvider.fetchCourses(token);
      if (mounted && subProvider.selectedCourseId.isNotEmpty) {
        await subProvider.fetchAssignments(token);
      }
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final provider = context.watch<SubmissionProvider>();
    final token = context.watch<AuthProvider>().accessToken;
    final isTablet = MediaQuery.of(context).size.width > 768;

    return Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios, color: Color(0xFF1F2238)),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'Bài tập về nhà',
          style: TextStyle(
            color: Color(0xFF1F2238),
            fontSize: 18,
            fontWeight: FontWeight.bold,
          ),
        ),
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(1),
          child: Container(color: const Color(0xFFE8E8E8), height: 1),
        ),
      ),
      body: SafeArea(
        child: provider.isLoadingCourses
            ? const Center(child: CircularProgressIndicator(color: Color(0xFFB90000)))
            : provider.courses.isEmpty
                ? _buildEmptyState()
                : Column(
                    children: [
                      // Course selector
                      Container(
                        margin: EdgeInsets.all(isTablet ? 20 : 16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'KHÓA HỌC',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFFBFBFBF),
                                letterSpacing: 1,
                              ),
                            ),
                            SizedBox(height: isTablet ? 10 : 6),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14),
                              decoration: BoxDecoration(
                                border: Border.all(color: const Color(0xFFE8E8E8)),
                                borderRadius: BorderRadius.circular(12),
                                color: Colors.white,
                              ),
                              child: DropdownButtonHideUnderline(
                                child: DropdownButton<String>(
                                  value: provider.selectedCourseId.isNotEmpty
                                      ? provider.selectedCourseId
                                      : null,
                                  isExpanded: true,
                                  hint: const Text('Chọn khóa học', style: TextStyle(fontSize: 13, color: Color(0xFFBFBFBF))),
                                  items: provider.courses.map((c) {
                                    return DropdownMenuItem(value: c.id, child: Text(c.name, style: const TextStyle(fontSize: 13)));
                                  }).toList(),
                                  onChanged: (val) {
                                    if (val != null) {
                                      provider.selectCourse(val);
                                      if (token != null) provider.fetchAssignments(token);
                                    }
                                  },
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),

                      // Search & Filter
                      Container(
                        margin: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 16),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: _searchController,
                                onChanged: (v) => provider.setSearch(v),
                                decoration: InputDecoration(
                                  hintText: 'Tìm kiếm bài tập...',
                                  hintStyle: const TextStyle(color: Color(0xFFBFBFBF), fontSize: 13),
                                  prefixIcon: const Icon(Icons.search, color: Color(0xFFBFBFBF), size: 20),
                                  border: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(color: Color(0xFFE8E8E8)),
                                  ),
                                  enabledBorder: OutlineInputBorder(
                                    borderRadius: BorderRadius.circular(12),
                                    borderSide: const BorderSide(color: Color(0xFFE8E8E8)),
                                  ),
                                  contentPadding: const EdgeInsets.symmetric(vertical: 10),
                                  filled: true,
                                  fillColor: Colors.white,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            isTablet
                                ? _buildFilterDropdown(provider)
                                : _buildFilterIconButton(provider),
                          ],
                        ),
                      ),

                      if (provider.error != null)
                        Container(
                          margin: EdgeInsets.all(isTablet ? 20 : 16),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFFFF1F0),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFFFA39E)),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.error_outline, color: Color(0xFFFF4D4F), size: 16),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  provider.error!,
                                  style: const TextStyle(fontSize: 12, color: Color(0xFFFF4D4F)),
                                ),
                              ),
                            ],
                          ),
                        ),

                      SizedBox(height: isTablet ? 12 : 8),

                      // Assignment list
                      Expanded(
                        child: provider.isLoadingAssignments
                            ? const Center(child: CircularProgressIndicator(color: Color(0xFFB90000)))
                            : provider.assignments.isEmpty
                                ? Center(
                                    child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Icon(Icons.assignment_outlined, size: 48, color: Colors.grey[300]),
                                        const SizedBox(height: 12),
                                        Text(
                                          'Không có bài tập nào',
                                          style: TextStyle(color: Colors.grey[400], fontSize: 14),
                                        ),
                                      ],
                                    ),
                                  )
                                : RefreshIndicator(
                                    onRefresh: () async {
                                      if (token != null) await provider.fetchAssignments(token);
                                    },
                                    child: ListView.builder(
                                      padding: EdgeInsets.symmetric(horizontal: isTablet ? 24 : 16),
                                      itemCount: provider.assignments.length,
                                      itemBuilder: (context, index) {
                                        final assignment = provider.assignments[index];
                                        final submission = provider.getSubmission(assignment.id);
                                        return _buildAssignmentCard(assignment, submission);
                                      },
                                    ),
                                  ),
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _buildFilterDropdown(SubmissionProvider provider) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        border: Border.all(color: const Color(0xFFE8E8E8)),
        borderRadius: BorderRadius.circular(12),
      ),
      child: DropdownButtonHideUnderline(
        child: DropdownButton<String>(
          value: provider.statusFilter,
          icon: const Icon(Icons.filter_list, size: 18, color: Color(0xFF8C8C8C)),
          items: const [
            DropdownMenuItem(value: 'all', child: Text('Tất cả', style: TextStyle(fontSize: 12))),
            DropdownMenuItem(value: 'active', child: Text('Đang mở', style: TextStyle(fontSize: 12))),
            DropdownMenuItem(value: 'closed', child: Text('Đã đóng', style: TextStyle(fontSize: 12))),
          ],
          onChanged: (v) {
            if (v != null) provider.setStatusFilter(v);
          },
        ),
      ),
    );
  }

  Widget _buildFilterIconButton(SubmissionProvider provider) {
    return GestureDetector(
      onTap: () => _showFilterBottomSheet(provider),
      child: Container(
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          border: Border.all(color: const Color(0xFFE8E8E8)),
          borderRadius: BorderRadius.circular(12),
        ),
        child: const Icon(Icons.filter_list, color: Color(0xFF8C8C8C), size: 20),
      ),
    );
  }

  void _showFilterBottomSheet(SubmissionProvider provider) {
    showModalBottomSheet(
      context: context,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (ctx) {
        return Padding(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text(
                'Lọc bài tập',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1F2238)),
              ),
              const SizedBox(height: 16),
              _buildFilterOption(ctx, provider, 'all', 'Tất cả'),
              _buildFilterOption(ctx, provider, 'active', 'Đang mở'),
              _buildFilterOption(ctx, provider, 'closed', 'Đã đóng'),
              const SizedBox(height: 8),
            ],
          ),
        );
      },
    );
  }

  Widget _buildFilterOption(BuildContext ctx, SubmissionProvider provider, String value, String label) {
    final selected = provider.statusFilter == value;
    return GestureDetector(
      onTap: () {
        provider.setStatusFilter(value);
        Navigator.pop(ctx);
      },
      child: Container(
        width: double.infinity,
        padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 12),
        margin: const EdgeInsets.only(bottom: 4),
        decoration: BoxDecoration(
          color: selected ? const Color(0xFFB90000).withOpacity(0.06) : Colors.transparent,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Row(
          children: [
            Icon(
              selected ? Icons.radio_button_checked : Icons.radio_button_off,
              size: 18,
              color: selected ? const Color(0xFFB90000) : const Color(0xFFBFBFBF),
            ),
            const SizedBox(width: 10),
            Text(
              label,
              style: TextStyle(
                fontSize: 14,
                fontWeight: selected ? FontWeight.w600 : FontWeight.normal,
                color: selected ? const Color(0xFFB90000) : const Color(0xFF595959),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildAssignmentCard(Assignment assignment, Submission? submission) {
    final subStatus = submission?.status ?? 'not_submitted';
    final isGraded = subStatus == 'graded';
    final isSubmitted = subStatus == 'submitted';
    final isLate = subStatus == 'late';
    final isOpen = assignment.isOpen;

    Color statusColor;
    String statusLabel;
    if (isGraded) {
      statusColor = const Color(0xFF1890FF);
      statusLabel = 'Đã chấm điểm';
    } else if (isSubmitted) {
      statusColor = const Color(0xFF52C41A);
      statusLabel = 'Đã nộp';
    } else if (isLate) {
      statusColor = const Color(0xFFFA8C16);
      statusLabel = 'Nộp trễ';
    } else {
      statusColor = const Color(0xFF8C8C8C);
      statusLabel = 'Chưa nộp';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFFE8E8E8)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: const Color(0xFFF5F5F5),
                  borderRadius: BorderRadius.circular(4),
                ),
                child: Text(
                  'BÀI TẬP',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey[500],
                    letterSpacing: 0.5,
                  ),
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: isOpen ? const Color(0xFFF6FFED) : const Color(0xFFFFF1F0),
                  borderRadius: BorderRadius.circular(6),
                  border: Border.all(
                    color: isOpen ? const Color(0xFFB7EB8F) : const Color(0xFFFFA39E),
                  ),
                ),
                child: Text(
                  isOpen ? 'Đang mở' : 'Đã đóng',
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: isOpen ? const Color(0xFF52C41A) : const Color(0xFFFF4D4F),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            assignment.title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1F2238),
            ),
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildInfoChip(Icons.book_outlined, assignment.courseName),
              const SizedBox(width: 12),
              _buildInfoChip(Icons.person_outline, assignment.teacherName),
            ],
          ),
          const SizedBox(height: 8),
          Row(
            children: [
              _buildInfoChip(Icons.calendar_today, _formatDate(assignment.createdAt)),
              const SizedBox(width: 12),
              _buildInfoChip(Icons.access_time, _formatDate(assignment.dueDate), color: const Color(0xFFFF4D4F)),
            ],
          ),
          const Divider(height: 20, color: Color(0xFFF0F0F0)),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  const Text('Bài nộp: ', style: TextStyle(fontSize: 11, color: Color(0xFF8C8C8C))),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                      border: Border.all(color: statusColor.withOpacity(0.3)),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: statusColor),
                    ),
                  ),
                ],
              ),
              if (isGraded && submission != null)
                Text(
                  '${submission.score ?? '?'} / ${assignment.maxScore}',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1890FF),
                  ),
                ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildInfoChip(IconData icon, String text, {Color color = const Color(0xFF8C8C8C)}) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(icon, size: 12, color: color),
        const SizedBox(width: 4),
        Text(
          text,
          style: TextStyle(fontSize: 11, color: color),
        ),
      ],
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(Icons.book_outlined, size: 64, color: Colors.grey[300]),
          const SizedBox(height: 16),
          const Text(
            'Bạn chưa đăng ký khóa học nào',
            style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1F2238)),
          ),
          const SizedBox(height: 8),
          Text(
            'Vui lòng đăng ký khóa học để xem bài tập',
            style: TextStyle(fontSize: 13, color: Colors.grey[400]),
          ),
        ],
      ),
    );
  }

  String _formatDate(String dateStr) {
    try {
      final dt = DateTime.parse(dateStr);
      return '${dt.day}/${dt.month}/${dt.year}';
    } catch (_) {
      return dateStr;
    }
  }
}

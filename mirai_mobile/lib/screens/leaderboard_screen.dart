import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/api_service.dart';
import '../models/leaderboard_model.dart';

class LeaderboardScreen extends StatefulWidget {
  final String courseId;
  final String courseName;

  const LeaderboardScreen({
    super.key,
    required this.courseId,
    required this.courseName,
  });

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> with SingleTickerProviderStateMixin {
  final ApiService _apiService = ApiService();
  late TabController _tabController;

  String? _selectedCourseId;
  String? _selectedCourseName;
  List<Map<String, dynamic>> _studentCourses = [];
  
  bool _isLoadingCourses = false;
  bool _isLoadingLeaderboard = false;

  List<LeaderboardEntry> _leaderboardEntries = [];
  StudentRankInfo? _myRankInfo;

  static const _red = Color(0xFFB90000);
  static const _redLight = Color(0xFFFFEDED);
  static const _gold = Color(0xFFFFD700);
  static const _silver = Color(0xFFC0C0C0);
  static const _bronze = Color(0xFFCD7F32);

  // Tabs: 0 - Overall, 1 - Attendance, 2 - Assignment, 3 - Quiz
  final List<String> _components = ['overall', 'attendance', 'assignment', 'quiz'];

  @override
  void initState() {
    super.initState();
    _selectedCourseId = widget.courseId;
    _selectedCourseName = widget.courseName;

    _tabController = TabController(length: 4, vsync: this);
    _tabController.addListener(_onTabChanged);

    _loadData();
  }

  @override
  void dispose() {
    _tabController.removeListener(_onTabChanged);
    _tabController.dispose();
    super.dispose();
  }

  void _onTabChanged() {
    if (_tabController.indexIsChanging) return;
    _fetchLeaderboard();
  }

  Future<void> _loadData() async {
    await _fetchCourses();
    await _fetchLeaderboard();
  }

  Future<void> _fetchCourses() async {
    if (!mounted) return;
    setState(() => _isLoadingCourses = true);
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;

    if (token == null) return;
    try {
      final courses = await _apiService.fetchStudentCourses(token);
      if (mounted) {
        setState(() {
          _studentCourses = courses;
        });
      }
    } catch (e) {
      debugPrint('Error fetching courses for leaderboard dropdown: $e');
    } finally {
      if (mounted) {
        setState(() => _isLoadingCourses = false);
      }
    }
  }

  Future<void> _fetchLeaderboard() async {
    if (_selectedCourseId == null || !mounted) return;
    setState(() => _isLoadingLeaderboard = true);

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final token = authProvider.accessToken;
    final user = authProvider.user;

    if (token == null || user == null) {
      if (mounted) setState(() => _isLoadingLeaderboard = false);
      return;
    }

    final activeComponent = _components[_tabController.index];

    try {
      // 1. Fetch Leaderboard Entries
      Map<String, dynamic> response;
      if (activeComponent == 'overall') {
        response = await _apiService.fetchCourseLeaderboard(token, _selectedCourseId!);
      } else {
        response = await _apiService.fetchLeaderboardByComponent(token, _selectedCourseId!, activeComponent);
      }

      final List<LeaderboardEntry> entries = [];
      if (response['success'] == true && response['data'] != null) {
        final dataMap = response['data'] as Map<String, dynamic>? ?? {};
        final list = dataMap['topStudents'] as List? ?? [];
        for (var item in list) {
          entries.add(LeaderboardEntry.fromJson(Map<String, dynamic>.from(item)));
        }
      }

      // 2. Fetch My Rank
      StudentRankInfo? myRank;
      try {
        final myRankResponse = await _apiService.fetchStudentRankInCourse(token, user.id, _selectedCourseId!);
        if (myRankResponse['success'] == true && myRankResponse['data'] != null) {
          myRank = StudentRankInfo.fromJson(Map<String, dynamic>.from(myRankResponse['data']));
        }
      } catch (err) {
        debugPrint('My rank not found or error: $err');
      }

      if (mounted) {
        setState(() {
          _leaderboardEntries = entries;
          _myRankInfo = myRank;
        });
      }
    } catch (e) {
      debugPrint('Error fetching leaderboard: $e');
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Lỗi tải bảng xếp hạng: ${e.toString()}'), backgroundColor: _red),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoadingLeaderboard = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF9F9FB),
      appBar: AppBar(
        backgroundColor: _red,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new_rounded, color: Colors.white),
          onPressed: () => Navigator.of(context).pop(),
        ),
        title: const Text(
          'BẢNG XẾP HẠNG',
          style: TextStyle(
            color: Colors.white,
            fontSize: 16,
            fontWeight: FontWeight.bold,
            letterSpacing: 1.2,
          ),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // ─── Header & Course Selector Dropdown ──────────────────────────────
          _buildCourseHeaderSelector(),
          
          // ─── Component Tab Bar ─────────────────────────────────────────────
          _buildTabBarFilter(),

          // ─── Main Content (Podium & List) ──────────────────────────────────
          Expanded(
            child: _isLoadingLeaderboard
                ? const Center(child: CircularProgressIndicator(color: _red))
                : _leaderboardEntries.isEmpty
                    ? _buildEmptyState()
                    : Stack(
                        children: [
                          RefreshIndicator(
                            color: _red,
                            onRefresh: _fetchLeaderboard,
                            child: ListView(
                              padding: const EdgeInsets.only(bottom: 90),
                              children: [
                                const SizedBox(height: 20),
                                // Podium for top 3
                                _buildPodiumSection(),
                                const SizedBox(height: 24),
                                // List for remaining ranks
                                _buildRanksListSection(),
                              ],
                            ),
                          ),
                          // Sticky bottom own rank card
                          _buildMyStickyRankCard(),
                        ],
                      ),
          ),
        ],
      ),
    );
  }

  Widget _buildCourseHeaderSelector() {
    return Container(
      color: _red,
      padding: const EdgeInsets.only(left: 20, right: 20, bottom: 20, top: 4),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.15),
          borderRadius: BorderRadius.circular(14),
        ),
        child: DropdownButtonHideUnderline(
          child: DropdownButton<String>(
            value: _selectedCourseId,
            icon: const Icon(Icons.keyboard_arrow_down_rounded, color: Colors.white),
            dropdownColor: _red,
            isExpanded: true,
            style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.bold),
            items: _studentCourses.map((course) {
              final id = course['_id']?.toString() ?? '';
              final name = course['name']?.toString() ?? 'Khóa học';
              return DropdownMenuItem<String>(
                value: id,
                child: Text(
                  name,
                  overflow: TextOverflow.ellipsis,
                ),
              );
            }).toList(),
            onChanged: (newVal) {
              if (newVal == null || newVal == _selectedCourseId) return;
              final matched = _studentCourses.firstWhere((c) => c['_id'] == newVal);
              setState(() {
                _selectedCourseId = newVal;
                _selectedCourseName = matched['name']?.toString() ?? 'Khóa học';
              });
              _fetchLeaderboard();
            },
          ),
        ),
      ),
    );
  }

  Widget _buildTabBarFilter() {
    return Container(
      decoration: const BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black12,
            blurRadius: 4,
            offset: Offset(0, 2),
          )
        ],
      ),
      child: TabBar(
        controller: _tabController,
        labelColor: _red,
        unselectedLabelColor: Colors.black45,
        indicatorColor: _red,
        indicatorSize: TabBarIndicatorSize.tab,
        labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
        tabs: const [
          Tab(text: 'Chung'),
          Tab(text: 'Chuyên cần'),
          Tab(text: 'Bài tập'),
          Tab(text: 'Quiz'),
        ],
      ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.emoji_events_outlined, color: Colors.black26, size: 64),
          const SizedBox(height: 16),
          Text(
            'Chưa có dữ liệu xếp hạng lớp học này',
            style: TextStyle(color: Colors.black54, fontSize: 14, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }

  // --- PODIUM SECTION (TOP 3) ---
  Widget _buildPodiumSection() {
    final top1 = _leaderboardEntries.isNotEmpty ? _leaderboardEntries[0] : null;
    final top2 = _leaderboardEntries.length > 1 ? _leaderboardEntries[1] : null;
    final top3 = _leaderboardEntries.length > 2 ? _leaderboardEntries[2] : null;

    final componentType = _components[_tabController.index];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      padding: const EdgeInsets.symmetric(vertical: 24, horizontal: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          // Top 2 (Left)
          Expanded(
            child: top2 != null 
                ? _buildPodiumColumn(top2, 2, _silver, 110, componentType)
                : const SizedBox(),
          ),
          const SizedBox(width: 8),
          // Top 1 (Center)
          Expanded(
            child: top1 != null 
                ? _buildPodiumColumn(top1, 1, _gold, 140, componentType)
                : const SizedBox(),
          ),
          const SizedBox(width: 8),
          // Top 3 (Right)
          Expanded(
            child: top3 != null 
                ? _buildPodiumColumn(top3, 3, _bronze, 90, componentType)
                : const SizedBox(),
          ),
        ],
      ),
    );
  }

  Widget _buildPodiumColumn(
    LeaderboardEntry entry, 
    int rank, 
    Color rankColor, 
    double height,
    String componentType,
  ) {
    double displayScore = entry.finalScore;
    if (componentType == 'attendance') {
      displayScore = entry.attendanceScore ?? entry.score ?? entry.finalScore;
    } else if (componentType == 'assignment') {
      displayScore = entry.assignmentScore ?? entry.score ?? entry.finalScore;
    } else if (componentType == 'quiz') {
      displayScore = entry.quizScore ?? entry.score ?? entry.finalScore;
    }

    String scoreLabel = '';
    if (componentType == 'attendance') {
      scoreLabel = '${displayScore.toStringAsFixed(0)}%';
    } else {
      scoreLabel = displayScore.toStringAsFixed(1);
    }

    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        // Crown above top 1
        if (rank == 1)
          const Icon(
            Icons.workspace_premium_rounded,
            color: _gold,
            size: 26,
          ),
        if (rank != 1)
          const SizedBox(height: 26),

        const SizedBox(height: 6),
        
        // Avatar
        Stack(
          alignment: Alignment.bottomCenter,
          children: [
            Container(
              padding: const EdgeInsets.all(2.5),
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                border: Border.all(color: rankColor, width: 2),
              ),
              child: CircleAvatar(
                radius: rank == 1 ? 28 : 22,
                backgroundColor: _redLight,
                backgroundImage: entry.student.avatar != null && entry.student.avatar!.isNotEmpty
                    ? NetworkImage(entry.student.avatar!)
                    : null,
                child: entry.student.avatar == null || entry.student.avatar!.isEmpty
                    ? Text(
                        entry.student.name.isNotEmpty ? entry.student.name[0].toUpperCase() : 'U',
                        style: TextStyle(
                          fontSize: rank == 1 ? 22 : 16,
                          fontWeight: FontWeight.bold,
                          color: _red,
                        ),
                      )
                    : null,
              ),
            ),
            // Rank badge below avatar
            Positioned(
              bottom: -4,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: rankColor,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Text(
                  '#$rank',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 9,
                  ),
                ),
              ),
            ),
          ],
        ),
        
        const SizedBox(height: 14),

        // Name
        Text(
          entry.student.name,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1A1A1A)),
        ),

        const SizedBox(height: 4),

        // Score
        Text(
          scoreLabel,
          style: TextStyle(
            fontWeight: FontWeight.w900,
            fontSize: rank == 1 ? 14 : 12,
            color: _red,
          ),
        ),

        const SizedBox(height: 10),

        // Gradient Podium Pillar
        Container(
          height: height,
          width: double.infinity,
          decoration: BoxDecoration(
            borderRadius: const BorderRadius.vertical(top: Radius.circular(16)),
            gradient: LinearGradient(
              colors: [
                rankColor.withOpacity(0.4),
                rankColor.withOpacity(0.1),
              ],
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
            ),
            border: Border(
              top: BorderSide(color: rankColor.withOpacity(0.5), width: 1.5),
              left: BorderSide(color: rankColor.withOpacity(0.2), width: 1),
              right: BorderSide(color: rankColor.withOpacity(0.2), width: 1),
            ),
          ),
          child: Center(
            child: Icon(
              Icons.trending_up_rounded,
              color: rankColor.withOpacity(0.6),
              size: 20,
            ),
          ),
        ),
      ],
    );
  }

  // --- RANKS LIST (RANK 4+) ---
  Widget _buildRanksListSection() {
    if (_leaderboardEntries.length <= 3) return const SizedBox();
    final list = _leaderboardEntries.sublist(3);
    final componentType = _components[_tabController.index];

    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(color: Colors.black.withOpacity(0.02), blurRadius: 10, offset: const Offset(0, 4))
        ],
      ),
      child: ListView.separated(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        itemCount: list.length,
        separatorBuilder: (_, __) => const Divider(height: 1, color: Color(0xFFF2F2F2)),
        itemBuilder: (context, index) {
          final entry = list[index];
          final rank = entry.rank;
          
          double displayScore = entry.finalScore;
          if (componentType == 'attendance') {
            displayScore = entry.attendanceScore ?? entry.score ?? entry.finalScore;
          } else if (componentType == 'assignment') {
            displayScore = entry.assignmentScore ?? entry.score ?? entry.finalScore;
          } else if (componentType == 'quiz') {
            displayScore = entry.quizScore ?? entry.score ?? entry.finalScore;
          }

          String scoreText = componentType == 'attendance' ? '${displayScore.toStringAsFixed(0)}%' : displayScore.toStringAsFixed(1);

          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            child: Row(
              children: [
                // Rank number
                SizedBox(
                  width: 32,
                  child: Text(
                    '#$rank',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: Colors.black45,
                    ),
                  ),
                ),
                
                // Avatar
                CircleAvatar(
                  radius: 18,
                  backgroundColor: _redLight,
                  backgroundImage: entry.student.avatar != null && entry.student.avatar!.isNotEmpty
                      ? NetworkImage(entry.student.avatar!)
                      : null,
                  child: entry.student.avatar == null || entry.student.avatar!.isEmpty
                      ? Text(
                          entry.student.name.isNotEmpty ? entry.student.name[0].toUpperCase() : 'U',
                          style: const TextStyle(
                            fontSize: 13,
                            fontWeight: FontWeight.bold,
                            color: _red,
                          ),
                        )
                      : null,
                ),

                const SizedBox(width: 14),

                // Name
                Expanded(
                  child: Text(
                    entry.student.name,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                      color: Color(0xFF1A1A1A),
                    ),
                  ),
                ),

                // Score
                Text(
                  scoreText,
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 13,
                    color: _red,
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  // --- STICKY BOTTOM CARD FOR LOGGED IN USER ---
  Widget _buildMyStickyRankCard() {
    if (_myRankInfo == null) return const SizedBox();

    final rank = _myRankInfo!.rank;
    final total = _myRankInfo!.totalStudents;
    final componentType = _components[_tabController.index];

    double displayScore = _myRankInfo!.finalScore;
    if (componentType == 'attendance') {
      displayScore = _myRankInfo!.attendanceScore ?? 0.0;
    } else if (componentType == 'assignment') {
      displayScore = _myRankInfo!.assignmentScore ?? 0.0;
    } else if (componentType == 'quiz') {
      displayScore = _myRankInfo!.quizScore ?? 0.0;
    }

    String scoreText = componentType == 'attendance' ? '${displayScore.toStringAsFixed(0)}%' : displayScore.toStringAsFixed(1);

    return Positioned(
      bottom: 0,
      left: 0,
      right: 0,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.08),
              blurRadius: 16,
              offset: const Offset(0, -4),
            )
          ],
        ),
        child: SafeArea(
          top: false,
          child: Row(
            children: [
              // User Rank index
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                decoration: BoxDecoration(
                  color: _red,
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'Hạng #$rank',
                  style: const TextStyle(
                    color: Colors.white,
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                  ),
                ),
              ),

              const SizedBox(width: 14),

              // User Info
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Text(
                      'Thành tích của bạn',
                      style: TextStyle(color: Colors.black38, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _myRankInfo!.student.name,
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1A1A1A)),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ],
                ),
              ),

              // Score
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'Điểm số',
                    style: TextStyle(color: Colors.black38, fontSize: 10, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    scoreText,
                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: _red),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

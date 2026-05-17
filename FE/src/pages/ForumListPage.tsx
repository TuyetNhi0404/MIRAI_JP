import React, { useEffect, useState, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { fetchThreads, createNewThread } from "../redux/slices/forumSlice";
import ThreadListItem from "../components/forum/ThreadListItem";
import NewPostForm from "../components/forum/NewPostForm";
import { ThreadDetailModalContent } from "../components/forum/ThreadDetailView";
import { 
    Box, 
    CircularProgress, 
    Typography, 
    Chip, 
    Dialog, 
    IconButton,
    TextField,
    InputAdornment,
    Paper,
    List,
    ListItem,
    ListItemText,
    Popper,
    ClickAwayListener,
    useTheme,
    useMediaQuery,
    Button,
    Menu,
    MenuItem
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import type { RootState, AppDispatch } from "../redux/store";
import { useDispatch, useSelector } from "react-redux";
import { getPendingPosts, searchPosts, getThreadComments, type SearchPostsResponse } from "../services/forum.service";
import type { ForumPost, ForumThread, ForumComment } from "../types/forum.type";
import { useToast } from "../hooks/useToast";

// Type helper for ID that can be string or object with _id
type UserIdLike = string | { _id: string } | { _id?: string };

// Helper function to normalize ID to string
function normalizeId(id: UserIdLike): string {
  if (typeof id === 'object' && id !== null) {
    return id._id ? String(id._id) : String(id);
  }
  return String(id);
}


const ForumListPage: React.FC = () => {
    const location = useLocation();
    const dispatch = useDispatch<AppDispatch>();
    const { threads, loading } = useSelector((s: RootState) => s.forum);
    const user = useSelector((s: RootState) => s.auth.user);
    const isAdmin = user?.role === "admin";
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const [tabValue, setTabValue] = useState<0 | 1>(0); // 0: approved, 1: pending
    const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
    const [pendingPosts, setPendingPosts] = useState<ForumPost[]>([]);
    const [loadingPending, setLoadingPending] = useState(false);
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
    const [editModeThreadId, setEditModeThreadId] = useState<string | null>(null);
    const { showSuccess, showError, ToastComponent } = useToast();
    
    // Search states
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ForumPost[]>([]);
    const [searchResultsThreads, setSearchResultsThreads] = useState<ForumThread[]>([]);
    const [suggestions, setSuggestions] = useState<Array<{ id: string; title: string }>>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [isSearchMode, setIsSearchMode] = useState(false);
    const [searchAnchorEl, setSearchAnchorEl] = useState<HTMLElement | null>(null);
    const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
    const searchInputRef = useRef<HTMLInputElement>(null);
    const suggestionsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    
    const threadListRef = useRef<HTMLDivElement>(null); 
    const shouldScrollRef = useRef(false);

    // Handle URL changes and query params for threadId - Watch location changes
    useEffect(() => {
        const path = location.pathname;
        
        // Check URL path /thread/:threadId first
        if (path.startsWith('/thread/')) {
            const threadId = path.split('/thread/')[1];
            if (threadId) {
                // Update URL to include threadId as query param immediately
                window.history.replaceState(null, '', `/faq?threadId=${threadId}`);
                setSelectedThreadId(threadId);
                return; // Exit early to avoid checking query params
            }
        }
        
        // Check query params for threadId and tab
        const urlParams = new URLSearchParams(location.search);
        const threadIdFromQuery = urlParams.get('threadId');
        const tabParam = urlParams.get('tab');
        
        // If tab=pending and user is admin, switch to pending tab
        if (tabParam === 'pending' && isAdmin && tabValue !== 1) {
            setTabValue(1);
        }
        
        if (threadIdFromQuery && threadIdFromQuery !== selectedThreadId) {
            setSelectedThreadId(threadIdFromQuery);
        } else if (!threadIdFromQuery && location.pathname === '/faq') {
            // If on /faq without threadId, close modal
            setSelectedThreadId(null);
        }
    }, [location.pathname, location.search]); // Watch location changes

    // Handle browser back/forward navigation
    useEffect(() => {
        const handlePopState = () => {
            const urlParams = new URLSearchParams(window.location.search);
            const threadId = urlParams.get('threadId');
            const path = window.location.pathname;
            
            // If path is /thread/:id, convert it
            if (path.startsWith('/thread/')) {
                const threadIdFromPath = path.split('/thread/')[1];
                if (threadIdFromPath) {
                    window.history.replaceState(null, '', `/faq?threadId=${threadIdFromPath}`);
                    setSelectedThreadId(threadIdFromPath);
                    return;
                }
            }
            
            // Otherwise use query param
                if (threadId) {
                    setSelectedThreadId(threadId);
            } else {
                setSelectedThreadId(null);
            }
        };
        
        window.addEventListener('popstate', handlePopState);
        return () => window.removeEventListener('popstate', handlePopState);
    }, []);

    useEffect(() => {
        const loadThreads = async () => {
            try {
                const currentUserId = user?._id || undefined;
                await dispatch(fetchThreads(currentUserId)).unwrap();
            } catch (err) {
                console.error("Error loading threads:", err);
            }
        };
        loadThreads();
    }, [dispatch, user]);

    useEffect(() => {
        const loadPendingPosts = async () => {
            if (!isAdmin) return;
            try {
                setLoadingPending(true);
                const posts = await getPendingPosts();
                setPendingPosts(posts);
            } catch (err) {
                console.error("Error loading pending posts:", err);
            } finally {
                setLoadingPending(false);
            }
        };
        loadPendingPosts();
    }, [isAdmin]);
    
    useEffect(() => {
        if (threadListRef.current && shouldScrollRef.current) {
            threadListRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
            shouldScrollRef.current = false;
        }
    }, [threads.length]);

    // Fetch suggestions as user types (debounced)
    useEffect(() => {
        // Clear previous timeout
        if (suggestionsTimeoutRef.current) {
            clearTimeout(suggestionsTimeoutRef.current);
        }

        // If search query is empty, clear suggestions
        if (!searchQuery.trim() || tabValue === 1) {
            setSuggestions([]);
            setSearchAnchorEl(null);
            return;
        }

        // Set anchor element when user is typing
        if (searchInputRef.current) {
            setSearchAnchorEl(searchInputRef.current);
        }

        // Debounce: wait 300ms after user stops typing before fetching suggestions
        setIsLoadingSuggestions(true);
        suggestionsTimeoutRef.current = setTimeout(async () => {
            try {
                const response: SearchPostsResponse = await searchPosts(
                    searchQuery.trim(),
                    1,
                    5 // Only get a few results for suggestions
                );
                setSuggestions(response.suggestions || []);
            } catch (err) {
                console.error("Error fetching suggestions:", err);
                setSuggestions([]);
            } finally {
                setIsLoadingSuggestions(false);
            }
        }, 300);

        // Cleanup timeout on unmount or when searchQuery changes
        return () => {
            if (suggestionsTimeoutRef.current) {
                clearTimeout(suggestionsTimeoutRef.current);
            }
        };
    }, [searchQuery, tabValue, user]);


    const displayPendingPosts = useMemo(() => {
        if (!pendingPosts) return [];
        return pendingPosts;
    }, [pendingPosts]);

    const displayApprovedThreads = useMemo(() => {
        if (isSearchMode && searchResultsThreads.length > 0) {
            return searchResultsThreads;
        }
        if (!threads) return [];
        return threads;
    }, [threads, isSearchMode, searchResultsThreads]);

    const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
        setMenuAnchorEl(event.currentTarget);
    };

    const handleMenuClose = () => {
        setMenuAnchorEl(null);
    };

    const handleMenuSelect = (value: 0 | 1) => {
        setTabValue(value);
        handleMenuClose();
    };

    const handleReload = async () => {
        if (tabValue === 1) {
            // Reload pending posts
            try {
                setLoadingPending(true);
                const posts = await getPendingPosts();
                setPendingPosts(posts);
            } catch (err) {
                console.error("Error reloading pending posts:", err);
            } finally {
                setLoadingPending(false);
            }
        } else {
            // Reload approved posts
            const currentUserId = user?._id || undefined;
            await dispatch(fetchThreads(currentUserId)).unwrap();
        }
    };

    const handleCreate = async (title: string, content: string, images?: File[]) => {
        try {
            await dispatch(
                createNewThread({
                    title: title.slice(0, 50), 
                    content: content,
                    images: images,
                })
            ).unwrap();
            
            // Show success message
            showSuccess("Post created successfully! The post is pending admin approval.");
            
            shouldScrollRef.current = true; 

        } catch (err: unknown) {
            // Khi dùng rejectWithValue với string, error từ .unwrap() có thể có nhiều cấu trúc:
            // 1. Nếu là SerializedError: err.message hoặc err.payload
            // 2. Nếu rejectWithValue truyền string: có thể err chính là string, hoặc err.payload là string
            // 3. Nếu là AxiosError: err.response.data.message
            let errorMessage: string | null = null;
            
            // Thử các cách lấy error message
            if (typeof err === 'string') {
                errorMessage = err;
            } else if (err && typeof err === 'object') {
                const errorObj = err as { payload?: string; response?: { data?: { message?: string } }; message?: string };
                if (errorObj.payload && typeof errorObj.payload === 'string') {
                    errorMessage = errorObj.payload;
                } else if (errorObj.response?.data?.message) {
                    errorMessage = errorObj.response.data.message;
                } else if (errorObj.message && typeof errorObj.message === 'string') {
                    errorMessage = errorObj.message;
                }
            }
            
            // Handle message: remove the "Post rejected X times. " or "Post rejected multiple times. " prefix
            // Only keep the ban notification (e.g., "You are banned from posting and interacting until...")
            if (errorMessage && typeof errorMessage === 'string') {
                // Remove prefix: "Post rejected X times. " or "Post rejected multiple times. "
                errorMessage = errorMessage.replace(/^Bài viết bị từ chối (lần \d+|nhiều lần)\.?\s*/, '');
            }
            
            // Show message from backend (banStatus.reason when 403)
            if (errorMessage && errorMessage.trim()) {
                showError(errorMessage);
            } else {
                showError("Unable to create new post. Please try again.");
            }
            throw err; 
        }
    };

    const handleSearch = async (query: string = searchQuery) => {
        if (!query.trim() || tabValue === 1) {
            setIsSearchMode(false);
            setSearchResults([]);
            setSearchResultsThreads([]);
            setSearchQuery("");
            setSuggestions([]);
            setSearchAnchorEl(null);
            // Reload normal threads
            const currentUserId = user?._id || undefined;
            await dispatch(fetchThreads(currentUserId)).unwrap();
            return;
        }

        try {
            setIsSearching(true);
            setIsSearchMode(true);
            setSearchAnchorEl(null); // Hide suggestions when performing actual search

            const currentUserId = user?._id || undefined;
            const response: SearchPostsResponse = await searchPosts(
                query.trim(),
                1,
                100 // Get more results for search
            );

            // Transform ForumPost to ForumThread
            const transformedThreads: ForumThread[] = await Promise.all(
                response.data.map(async (post) => {
                    try {
                        const comments = await getThreadComments(post._id);
                        const author = typeof post.authorId === 'object' && post.authorId ? post.authorId.name : 'Unknown';
                        const authorId = typeof post.authorId === 'object' && post.authorId ? post.authorId._id : post.authorId;
                        const authorAvatar = typeof post.authorId === 'object' && post.authorId ? post.authorId.avatar : undefined;
                        
                        // Determine user's reaction
                        let myReaction: "like" | "dislike" | null = null;
                        if (currentUserId) {
                            const userIdStr = String(currentUserId);
                            const likes = post.likes || [];
                            const dislikes = post.dislikes || [];
                            if (dislikes.some((id: UserIdLike) => normalizeId(id) === userIdStr)) {
                                myReaction = "dislike";
                            } else if (likes.some((id: UserIdLike) => normalizeId(id) === userIdStr)) {
                                myReaction = "like";
                            }
                        }
                        
                        const replies = comments.map((comment: ForumComment) => {
                            const commentAuthor = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId.name : 'Unknown';
                            const commentAuthorId = typeof comment.authorId === 'object' && comment.authorId ? comment.authorId._id : comment.authorId;
                            const createdAt = comment.createdAt 
                                ? (typeof comment.createdAt === 'string' ? comment.createdAt : comment.createdAt.toISOString())
                                : new Date().toISOString();
                            return {
                                replyId: comment._id,
                                threadId: post._id,
                                content: comment.content,
                                createdBy: commentAuthorId,
                                author: commentAuthor,
                                createdAt: createdAt,
                                reactions: {
                                    like: comment.likes?.length || 0,
                                    dislike: comment.dislikes?.length || 0,
                                },
                                images: comment.images || [],
                            };
                        });

                        return {
                            threadId: post._id,
                            title: post.title,
                            content: post.content,
                            createdBy: authorId,
                            author: author,
                            authorAvatar: authorAvatar,
                            createdAt: typeof post.createdAt === 'string' ? post.createdAt : (post.createdAt?.toISOString() || new Date().toISOString()),
                            reactions: {
                                like: post.likes?.length || 0,
                                dislike: post.dislikes?.length || 0,
                            },
                            replies: replies,
                            pinned: post.pinned || false,
                            images: post.images || [],
                            myReaction: myReaction,
                        };
                    } catch (err) {
                        console.warn(`Failed to fetch comments for post ${post._id}:`, err);
                        const author = typeof post.authorId === 'object' && post.authorId ? post.authorId.name : 'Unknown';
                        const authorId = typeof post.authorId === 'object' && post.authorId ? post.authorId._id : post.authorId;
                        const authorAvatar = typeof post.authorId === 'object' && post.authorId ? post.authorId.avatar : undefined;
                        
                        let myReaction: "like" | "dislike" | null = null;
                        if (currentUserId) {
                            const userIdStr = String(currentUserId);
                            const likes = post.likes || [];
                            const dislikes = post.dislikes || [];
                            if (dislikes.some((id: UserIdLike) => normalizeId(id) === userIdStr)) {
                                myReaction = "dislike";
                            } else if (likes.some((id: UserIdLike) => normalizeId(id) === userIdStr)) {
                                myReaction = "like";
                            }
                        }
                        
                        return {
                            threadId: post._id,
                            title: post.title,
                            content: post.content,
                            createdBy: authorId,
                            author: author,
                            authorAvatar: authorAvatar,
                            createdAt: typeof post.createdAt === 'string' ? post.createdAt : (post.createdAt?.toISOString() || new Date().toISOString()),
                            reactions: {
                                like: post.likes?.length || 0,
                                dislike: post.dislikes?.length || 0,
                            },
                            replies: [],
                            pinned: post.pinned || false,
                            images: post.images || [],
                            myReaction: myReaction,
                        };
                    }
                })
            );

            setSearchResults(response.data);
            setSearchResultsThreads(transformedThreads);
        } catch (err) {
            console.error("Error searching posts:", err);
            showError("Unable to search posts. Please try again.");
            setIsSearchMode(false);
            setSearchResults([]);
            setSearchResultsThreads([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSuggestionClick = (suggestion: { id: string; title: string }) => {
        setSearchQuery(suggestion.title);
        setSuggestions([]);
        setSearchAnchorEl(null);
        handleSearch(suggestion.title);
    };

    const handleSearchKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

    return (
        <>
            {/* Sticky Header with Tabs and Search - Full Width */}
            <Box
                sx={{
                    position: 'sticky',
                    top: { xs: '60px', sm: '68px' }, // Height of main header
                    zIndex: 1200,
                    backgroundColor: '#FFFFFF',
                    pt: { xs: 2, sm: 3 },
                    pb: { xs: 1.5, sm: 2 },
                    mb: { xs: 1, sm: 2 },
                    borderBottom: '2px solid #B90000',
                    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.05)',
                    minHeight: { xs: 'auto', sm: '80px' },
                }}
            >
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        position: 'relative',
                        backgroundColor: 'transparent',
                        pl: { xs: 1, sm: 2, md: 3 },
                        pr: { xs: 1, sm: 2, md: 3 },
                        justifyContent: 'space-between',
                        flexDirection: { xs: 'column', sm: 'row' },
                        gap: { xs: 2, sm: 0 },
                        minHeight: { xs: 'auto', sm: '80px' },
                    }}
                >
                    {/* Spacer for non-admin to balance layout */}
                    {!isAdmin && (
                        <Box sx={{ flex: 1, display: { xs: 'none', sm: 'block' } }} />
                    )}

                    {/* Dropdown Menu for Admin - Right side */}
                    {isAdmin && (
                        <Box
                            sx={{
                                ml: { xs: 0, sm: 'auto' },
                                order: { xs: 1, sm: 3 },
                                flexShrink: 0,
                            }}
                        >
                            <Button
                                onClick={handleMenuOpen}
                                endIcon={<ArrowDropDownIcon />}
                                sx={{
                                    minHeight: { xs: '40px', sm: '48px' },
                                    textTransform: 'none',
                                    fontSize: { xs: '14px', sm: '15px' },
                                    fontWeight: 600,
                                    px: { xs: 2, sm: 3 },
                                    py: { xs: 1, sm: 1.5 },
                                    color: '#023665',
                                    border: '2px solid #B90000',
                                    borderRadius: '12px',
                                    backgroundColor: '#FFFFFF',
                                    '&:hover': {
                                        backgroundColor: '#fff5e6',
                                        borderColor: '#d66a0e',
                                    },
                                }}
                            >
                                <Box display="flex" alignItems="center" gap={1}>
                                    <span>
                                        {tabValue === 0 ? 'Approved' : 'Pending'}
                                    </span>
                                    <Chip 
                                        label={tabValue === 0 ? threads.length : pendingPosts.length} 
                                        size="small" 
                                        color={tabValue === 0 ? "success" : "warning"}
                                        sx={{
                                            height: '20px',
                                            fontSize: '11px',
                                            fontWeight: 600,
                                        }}
                                    />
                                </Box>
                            </Button>
                            <Menu
                                anchorEl={menuAnchorEl}
                                open={Boolean(menuAnchorEl)}
                                onClose={handleMenuClose}
                                PaperProps={{
                                    sx: {
                                        mt: 1,
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                                        minWidth: 200,
                                        border: '1px solid #e5e7eb',
                                    },
                                }}
                            >
                                <MenuItem
                                    onClick={() => handleMenuSelect(0)}
                                    selected={tabValue === 0}
                                    sx={{
                                        py: 1.5,
                                        px: 2,
                                        '&.Mui-selected': {
                                            backgroundColor: '#fff5e6',
                                            color: '#B90000',
                                            fontWeight: 600,
                                            '&:hover': {
                                                backgroundColor: '#fff5e6',
                                            },
                                        },
                                        '&:hover': {
                                            backgroundColor: '#f9fafb',
                                        },
                                    }}
                                >
                                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                                        <span>Approved</span>
                                        <Chip 
                                            label={threads.length} 
                                            size="small" 
                                            color="success"
                                            sx={{
                                                height: '20px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                            }}
                                        />
                                    </Box>
                                </MenuItem>
                                <MenuItem
                                    onClick={() => handleMenuSelect(1)}
                                    selected={tabValue === 1}
                                    sx={{
                                        py: 1.5,
                                        px: 2,
                                        '&.Mui-selected': {
                                            backgroundColor: '#fff5e6',
                                            color: '#B90000',
                                            fontWeight: 600,
                                            '&:hover': {
                                                backgroundColor: '#fff5e6',
                                            },
                                        },
                                        '&:hover': {
                                            backgroundColor: '#f9fafb',
                                        },
                                    }}
                                >
                                    <Box display="flex" alignItems="center" justifyContent="space-between" width="100%">
                                        <span>Pending</span>
                                        <Chip 
                                            label={pendingPosts.length} 
                                            size="small" 
                                            color="warning"
                                            sx={{
                                                height: '20px',
                                                fontSize: '11px',
                                                fontWeight: 600,
                                            }}
                                        />
                                    </Box>
                                </MenuItem>
                            </Menu>
                        </Box>
                    )}

                    {/* Search Bar - Center */}
                    {tabValue === 0 && (
                        <Box sx={{ 
                            position: { xs: 'static', sm: 'absolute' },
                            left: { sm: '50%' },
                            top: { xs: 'auto', sm: '50%' },
                            transform: { xs: 'none', sm: 'translate(-50%, -50%)' },
                            width: { xs: '100%', sm: '400px', md: '500px' }, 
                            flexShrink: 0,
                            order: { xs: 2, sm: 2 },
                            zIndex: 1,
                        }}>
                                <TextField
                            fullWidth
                            placeholder="Search posts..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={handleSearchKeyPress}
                            inputRef={searchInputRef}
                            onFocus={(e) => {
                                if (searchQuery.trim() && searchInputRef.current) {
                                    setSearchAnchorEl(e.currentTarget);
                                }
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: '#B90000', fontSize: 20 }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchQuery && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => {
                                                setSearchQuery("");
                                                setIsSearchMode(false);
                                                setSearchResults([]);
                                                setSearchResultsThreads([]);
                                                setSuggestions([]);
                                                setSearchAnchorEl(null);
                                                const currentUserId = user?._id || undefined;
                                                dispatch(fetchThreads(currentUserId));
                                            }}
                                            sx={{
                                                '&:hover': {
                                                    backgroundColor: '#F2F3F5',
                                                },
                                            }}
                                        >
                                            <CloseIcon fontSize="small" sx={{ color: '#65676B' }} />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                backgroundColor: '#FFFFFF',
                                borderRadius: '12px',
                                boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                transition: 'all 0.2s ease-in-out',
                                '&:hover': {
                                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.15)',
                                },
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: '12px',
                                    paddingLeft: '4px',
                                    '& fieldset': {
                                        borderColor: '#e5e7eb',
                                        borderWidth: '1px',
                                    },
                                    '&:hover fieldset': {
                                        borderColor: '#B90000',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: '#B90000',
                                        borderWidth: '2px',
                                        boxShadow: '0 0 0 3px rgba(236, 117, 16, 0.1)',
                                    },
                                },
                                '& .MuiInputBase-input': {
                                    padding: '12px 16px',
                                    fontSize: '15px',
                                    color: '#023665',
                                    '&::placeholder': {
                                        color: '#6b7280',
                                        opacity: 1,
                                    },
                                },
                            }}
                        />

                        {/* Suggestions Dropdown */}
                        <Popper
                            open={Boolean(searchAnchorEl && (suggestions.length > 0 || isLoadingSuggestions) && !isSearchMode)}
                            anchorEl={searchAnchorEl}
                            placement="bottom-start"
                            style={{ width: searchInputRef.current?.offsetWidth, zIndex: 1300 }}
                        >
                            <ClickAwayListener onClickAway={() => setSearchAnchorEl(null)}>
                                <Paper
                                    elevation={0}
                                    sx={{
                                        mt: 0,
                                        maxHeight: 360,
                                        overflow: 'hidden',
                                        borderRadius: '0 0 8px 8px',
                                        backgroundColor: '#FFFFFF',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)',
                                        border: 'none',
                                        display: 'flex',
                                        flexDirection: 'column',
                                    }}
                                >
                                    {isLoadingSuggestions ? (
                                        <Box 
                                            display="flex" 
                                            justifyContent="center" 
                                            alignItems="center" 
                                            py={4}
                                            px={3}
                                        >
                                            <CircularProgress size={20} sx={{ color: '#B90000' }} />
                                            <Typography 
                                                variant="body2" 
                                                sx={{ 
                                                    color: '#023665',
                                                    fontSize: '14px',
                                                    ml: 1.5,
                                                    fontWeight: 500,
                                                }}
                                            >
                                                Searching...
                                            </Typography>
                                        </Box>
                                    ) : suggestions.length > 0 ? (
                                        <Box sx={{ overflowY: 'auto', maxHeight: 360 }}>
                                            <List sx={{ py: 0.5 }}>
                                                {suggestions.map((suggestion) => (
                                                    <ListItem
                                                        key={suggestion.id}
                                                        component="button"
                                                        onClick={() => handleSuggestionClick(suggestion)}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            py: 1.25,
                                                            px: 2.5,
                                                            mx: 0.5,
                                                            my: 0.25,
                                                            borderRadius: '6px',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            border: 'none',
                                                            background: 'transparent',
                                                            width: 'calc(100% - 4px)',
                                                            transition: 'all 0.15s ease',
                                                            '&:hover': {
                                                                backgroundColor: '#F2F3F5',
                                                            },
                                                            '&:active': {
                                                                backgroundColor: '#E4E6EB',
                                                                transform: 'scale(0.98)',
                                                            },
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 36,
                                                                height: 36,
                                                                borderRadius: '50%',
                                                                backgroundColor: '#F2F3F5',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                mr: 1.5,
                                                                flexShrink: 0,
                                                            }}
                                                        >
                                                            <SearchIcon 
                                                                sx={{ 
                                                                    color: '#B90000', 
                                                                    fontSize: 18,
                                                                }} 
                                                            />
                                                        </Box>
                                                        <ListItemText
                                                            primary={suggestion.title}
                                                            primaryTypographyProps={{
                                                                sx: {
                                                                    fontSize: '15px',
                                                                    fontWeight: 400,
                                                                    color: '#023665',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    whiteSpace: 'nowrap',
                                                                    lineHeight: 1.4,
                                                                },
                                                            }}
                                                        />
                                                    </ListItem>
                                                ))}
                                            </List>
                                        </Box>
                                    ) : searchQuery.trim() && !isLoadingSuggestions ? (
                                        <Box py={4} px={3} textAlign="center">
                                            <Typography 
                                                variant="body2" 
                                                sx={{
                                                    color: '#6b7280',
                                                    fontSize: '14px',
                                                    fontWeight: 400,
                                                }}
                                            >
                                                No suggestions found
                                            </Typography>
                                        </Box>
                                    ) : null}
                                </Paper>
                            </ClickAwayListener>
                            </Popper>
                        </Box>
                    )}
                </Box>
            </Box>

            <Box
                sx={{
                    maxWidth: { xs: '100%', sm: '800px', md: '1000px' }, 
                    margin: '0 auto', 
                    p: { xs: 1, sm: 2, md: 3 },
                    pt: { xs: 2, sm: 3 },
                    pb: { xs: 3, sm: 4 }
                }}
            >
                <NewPostForm
                    onSubmit={handleCreate}
                    placeholderTitle="Post title..."
                    placeholderContent="Post content..." 
                    submitLabel="Post"
                />

                {/* Show search results count */}
                {isSearchMode && searchQuery && (
                    <Box mt={2}>
                        <Typography variant="body2" color="text.secondary">
                            Found {searchResults.length} results for "{searchQuery}"
                        </Typography>
                    </Box>
                )}
                
                <Box mt={4} ref={threadListRef}> 
                    {(loading || (tabValue === 1 && loadingPending) || isSearching) ? (
                        <Box display="flex" justifyContent="center" py={5}>
                            <CircularProgress color="primary" />
                            <Typography ml={2} color="text.secondary">Loading posts...</Typography>
                        </Box>
                    ) : (
                        <>
                            {tabValue === 1 ? (
                                // Pending posts - transform to ForumThread format
                                displayPendingPosts.map((post: ForumPost) => {
                                    const author = typeof post.authorId === 'object' && post.authorId ? post.authorId.name : 'Unknown';
                                    const thread: ForumThread = {
                                        threadId: post._id,
                                        title: post.title,
                                        content: post.content,
                                        author: author,
                                        createdAt: post.createdAt.toString(),
                                        reactions: { like: 0, dislike: 0 },
                                        replies: [],
                                        pinned: false,
                                        images: post.images || [],
                                        status: post.status,
                                    };
                                    return (
                                        <ThreadListItem 
                                            key={post._id} 
                                            thread={thread} 
                                            onDeleted={handleReload}
                                            isPending={true}
                                        onThreadClick={() => {
                                            setEditModeThreadId(null);
                                            const threadId = post._id;
                                            setSelectedThreadId(threadId);
                                            // Update URL to include threadId without navigation
                                            window.history.pushState(null, '', `/faq?threadId=${threadId}`);
                                        }}
                                            onEditClick={() => {
                                                setEditModeThreadId(post._id);
                                                setSelectedThreadId(post._id);
                                            }}
                                        /> 
                                    );
                                })
                            ) : (
                                // Approved posts
                                displayApprovedThreads.map((t: ForumThread) => (
                                    <ThreadListItem 
                                        key={t.threadId} 
                                        thread={t} 
                                        onDeleted={handleReload}
                                        onThreadClick={() => {
                                            setEditModeThreadId(null);
                                            const threadId = String(t.threadId);
                                            setSelectedThreadId(threadId);
                                            // Update URL to include threadId without navigation
                                            window.history.pushState(null, '', `/faq?threadId=${threadId}`);
                                        }}
                                        onEditClick={() => {
                                            setEditModeThreadId(String(t.threadId));
                                            setSelectedThreadId(String(t.threadId));
                                        }}
                                    /> 
                                ))
                            )}

                            
                            {(tabValue === 1 ? displayPendingPosts.length === 0 : displayApprovedThreads.length === 0) && !loading && !loadingPending && !isSearching && (
                                <Typography variant="h6" color="text.secondary" textAlign="center" py={5}>
                                    {tabValue === 1 
                                        ? "No posts pending approval" 
                                        : isSearchMode && searchQuery
                                        ? `No results found for "${searchQuery}"`
                                        : "No posts yet. Be the first to post!"}
                                </Typography>
                            )}
                        </>
                    )}
                </Box>

            {/* Thread Detail Modal - Only one Dialog */}
            <Dialog
                open={Boolean(selectedThreadId)}
                onClose={() => {
                    setSelectedThreadId(null);
                    setEditModeThreadId(null);
                    window.history.replaceState(null, '', '/faq');
                }}
                maxWidth={isMobile ? false : "md"}
                fullWidth={!isMobile}
                fullScreen={isMobile}
                PaperProps={{
                    sx: {
                        borderRadius: { xs: 0, sm: 2 },
                        maxHeight: { xs: "100vh", sm: "90vh" },
                        backgroundColor: "#ECECEC",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        m: { xs: 0, sm: 2 },
                        border: '2px solid #B90000',
                    },
                }}
            >
                {/* Header */}
                <Box sx={{ 
                    position: "sticky",
                    top: 0,
                    zIndex: 10,
                    backgroundColor: "#FFFFFF",
                    borderBottom: "1px solid #E4E6EB",
                    px: 2,
                    py: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    borderRadius: "8px 8px 0 0",
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 700, color: "#023665" }}>
                        Post
                    </Typography>
                    <IconButton
                        onClick={() => setSelectedThreadId(null)}
                        sx={{
                            color: "#023665",
                            "&:hover": {
                                backgroundColor: "#fff5e6",
                                color: "#B90000",
                            },
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </Box>
                
                {/* Scrollable Content */}
                <Box sx={{ 
                    flex: 1,
                    overflowY: "auto",
                    overflowX: "hidden",
                    backgroundColor: "#ECECEC",
                    display: "flex",
                    flexDirection: "column",
                    minHeight: 0,
                }}>
                    {selectedThreadId && (
                        <ThreadDetailModalContent 
                            threadId={selectedThreadId}
                            initialEditMode={editModeThreadId === selectedThreadId}
                            onUpdate={handleReload}
                            onClose={() => {
                                setSelectedThreadId(null);
                                setEditModeThreadId(null);
                                // Remove threadId from URL when closing modal
                                window.history.replaceState(null, '', '/faq');
                                handleReload();
                            }}
                        />
                    )}
                </Box>
            </Dialog>
            <ToastComponent />
        </Box>
        </>
    );
};

export default ForumListPage;

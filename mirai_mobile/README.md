# Mirai Mobile - Hướng Dẫn Cài Đặt và Chạy Dự Án

Đây là tài liệu hướng dẫn các bước cần thiết để thiết lập và chạy dự án Mirai Mobile trên máy cá nhân sau khi pull/clone code từ Git.

## 🚀 Các Bước Cài Đặt

### 1. Tải các thư viện (Dependencies)
Mặc định các thư viện không được đẩy lên Git. Sau khi mở dự án, bạn cần tải chúng về:
Mở Terminal (hoặc Command Prompt) tại thư mục gốc của dự án (`mirai_mobile`) và chạy lệnh sau:

```bash
flutter pub get
```

### 2. Cấu hình Biến Môi Trường (.env)
Dự án sử dụng file `.env` để bảo mật các thông tin nhạy cảm (như API Key, Client ID). File này đã được đưa vào `.gitignore` nên bạn sẽ không thấy nó khi kéo code về.

- Tạo một file mới tên là `.env` (chính xác là `.env`) ở thư mục gốc của dự án (ngang hàng với file `pubspec.yaml`).
- Thêm các biến cấu hình cần thiết vào file này. (Hãy liên hệ với người quản lý dự án hoặc xem file `.env.example` nếu có để biết giá trị chính xác). 

**Ví dụ nội dung file `.env`:**
```env
GOOGLE_CLIENT_ID=nhap_google_client_id_vao_day
```

### 3. Lưu ý về Đăng nhập Google (Google Sign-In)
Dự án này đã được thiết lập để sử dụng chung một file keystore (`android/app/shared_debug.keystore`) cho toàn bộ nhóm phát triển.
- Nhờ thiết lập này, mã SHA-1 của dự án đã được đồng bộ.
- Bạn **KHÔNG CẦN** phải tạo mã SHA-1 mới hay thêm SHA-1 vào Firebase/Google Cloud Console trên máy của bạn. Tính năng đăng nhập bằng Google sẽ hoạt động bình thường ngay lập tức (miễn là bạn đã cấu hình đúng file `.env` ở Bước 2).
- Hãy chắc chắn rằng file `shared_debug.keystore` đã được pull về thành công nằm trong thư mục `android/app/`.

### 4. Chạy Ứng Dụng
Sau khi hoàn tất các bước trên, bạn đã sẵn sàng để chạy app:
1. Mở máy ảo Android/iOS (Emulator/Simulator) hoặc cắm điện thoại thật (đã bật USB Debugging).
2. Chạy lệnh sau trong Terminal:
   ```bash
   flutter run
   ```
   *(Hoặc nhấn nút **Run/Debug** trực tiếp trên Android Studio / VS Code).*

---

## 🛠 Một Số Lỗi Thường Gặp

- **Lỗi `Exception: File .env not found`**: Do bạn chưa tạo file `.env` ở Bước 2 hoặc đặt sai vị trí. Hãy đảm bảo file nằm ở thư mục gốc của dự án.
- **Lỗi `ApiException 10` khi đăng nhập Google**: Thường là do file `shared_debug.keystore` bị thiếu, hoặc file `.env` cấu hình sai `GOOGLE_CLIENT_ID`.
- **Lỗi thiếu package khi build**: Do quên chạy `flutter pub get` ở Bước 1.

Chúc bạn code vui vẻ! 🎉

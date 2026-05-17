import React, { useState } from "react";
import {
  Card,
  CardContent,
  TextField,
  Button,
  Box,
  CircularProgress,
  IconButton,
  ImageList,
  ImageListItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import CloudUploadIcon from "@mui/icons-material/CloudUpload";
import { useToast } from "../../hooks/useToast";

// 1️⃣ Định nghĩa interface props
interface NewPostFormProps {
  onSubmit: (title: string, content: string, images?: File[]) => Promise<void>;
  placeholderTitle?: string;
  placeholderContent?: string;
  submitLabel?: string;
}

const NewPostForm: React.FC<NewPostFormProps> = ({
  onSubmit,
  placeholderTitle = "Enter post title...",
  placeholderContent = "Enter post content...",
  submitLabel = "Post",
}) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { showError, ToastComponent } = useToast();

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      const newImages = [...images, ...files];
      setImages(newImages);
      
      // Create previews
      files.forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setImagePreviews((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setImagePreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    setLoading(true);
    try {
      await onSubmit(title, content, images.length > 0 ? images : undefined);
      setTitle("");
      setContent("");
      setImages([]);
      setImagePreviews([]);
      // Thông báo sẽ được hiển thị ở ForumListPage
    } catch (err: unknown) {
      console.error("Error creating thread:", err);
      // Kiểm tra nếu là lỗi 403 (bị ban) - thông báo đã được hiển thị ở ForumListPage
      // Chỉ hiển thị toast ở đây nếu không phải lỗi 403
      const error = err as { payload?: unknown; response?: { status?: number } };
      const errorStatus = error?.payload ? 403 : error?.response?.status; // Nếu có payload từ rejectWithValue thì là 403
      if (errorStatus !== 403) {
        showError("Unable to create post. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const isButtonDisabled = loading || !title.trim() || !content.trim();

  return (
    <Card 
      component="form" 
      onSubmit={handleSubmit} 
      sx={{ 
        mb: 2,
        borderRadius: 3,
        backgroundColor: "#FFFFFF",
        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
        border: "1px solid #e5e7eb",
        "&:hover": {
          boxShadow: "0 2px 6px rgba(0, 0, 0, 0.15)",
        },
        transition: "all 0.2s ease",
      }}
    >
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" flexDirection="column" gap={2}>
          <TextField
            fullWidth
            placeholder={placeholderTitle}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={loading}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: "#ECECEC",
                "& fieldset": {
                  borderColor: "#e5e7eb",
                },
                "&:hover fieldset": {
                  borderColor: "#B90000",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#B90000",
                  borderWidth: "2px",
                },
              },
              "& .MuiInputBase-input": {
                color: "#023665",
                "&::placeholder": {
                  color: "#6b7280",
                  opacity: 1,
                },
              },
            }}
          />
          <TextField
            fullWidth
            multiline
            minRows={4}
            placeholder={placeholderContent}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={loading}
            variant="outlined"
            sx={{
              "& .MuiOutlinedInput-root": {
                borderRadius: 2,
                backgroundColor: "#ECECEC",
                "& fieldset": {
                  borderColor: "#e5e7eb",
                },
                "&:hover fieldset": {
                  borderColor: "#B90000",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#B90000",
                  borderWidth: "2px",
                },
              },
              "& .MuiInputBase-input": {
                color: "#023665",
                "&::placeholder": {
                  color: "#6b7280",
                  opacity: 1,
                },
              },
            }}
          />
          
          {/* Image Upload */}
          <Box>
            <input
              accept="image/*"
              style={{ display: "none" }}
              id="image-upload"
              type="file"
              multiple
              onChange={handleImageChange}
              disabled={loading}
            />
            <label htmlFor="image-upload">
              <Button
                component="span"
                variant="outlined"
                startIcon={<CloudUploadIcon />}
                disabled={loading}
                sx={{ 
                  mb: 2,
                  borderColor: "#B90000",
                  color: "#B90000",
                  "&:hover": {
                    borderColor: "#d66a0e",
                    backgroundColor: "#fff5e6",
                  },
                }}
              >
                Add image
              </Button>
            </label>
            
            {imagePreviews.length > 0 && (
              <ImageList sx={{ width: "100%", height: 200 }} cols={3} rowHeight={164}>
                {imagePreviews.map((preview, index) => (
                  <ImageListItem key={index}>
                    <img
                      src={preview}
                      alt={`Preview ${index + 1}`}
                      loading="lazy"
                      style={{ objectFit: "cover" }}
                    />
                    <IconButton
                      sx={{
                        position: "absolute",
                        top: 0,
                        right: 0,
                        color: "white",
                        bgcolor: "rgba(0,0,0,0.5)",
                      }}
                      onClick={() => handleRemoveImage(index)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ImageListItem>
                ))}
              </ImageList>
            )}
          </Box>
          
          <Box display="flex" justifyContent="flex-end" pt={1}>
            <Button 
              type="submit" 
              variant="contained" 
              disabled={isButtonDisabled}
              sx={{
                backgroundColor: "#B90000",
                color: "#FFFFFF",
                fontWeight: 700,
                borderRadius: 2,
                px: 3,
                textTransform: "none",
                fontSize: "15px",
                boxShadow: "0 2px 4px rgba(236, 117, 16, 0.3)",
                "&:hover": {
                  backgroundColor: "#d66a0e",
                  boxShadow: "0 4px 8px rgba(236, 117, 16, 0.4)",
                },
                "&:disabled": {
                  backgroundColor: "#e5e7eb",
                  color: "#9ca3af",
                  boxShadow: "none",
                },
              }}
            >
              {loading ? <CircularProgress size={20} sx={{ color: "#FFFFFF" }} /> : submitLabel}
            </Button>
          </Box>
        </Box>
      </CardContent>
      <ToastComponent />
    </Card>
  );
};

export default NewPostForm;

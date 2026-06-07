import { Box, Skeleton, Stack, type SxProps, type Theme } from "@mui/material";

interface LoadingSkeletonProps {
  variant?: "card" | "row" | "stats" | "table";
  count?: number;
  sx?: SxProps<Theme>;
}

export function LoadingSkeleton({ variant = "row", count = 4, sx }: LoadingSkeletonProps) {
  if (variant === "stats") {
    return (
      <Box
        sx={[
          {
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "repeat(4, 1fr)",
            },
            gap: 2,
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={110}
            animation="wave"
            sx={{ borderRadius: 3 }}
          />
        ))}
      </Box>
    );
  }

  if (variant === "card") {
    return (
      <Box
        sx={[
          {
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              md: "1fr 1fr",
              lg: "repeat(3, 1fr)",
            },
            gap: 2,
          },
          ...(Array.isArray(sx) ? sx : [sx]),
        ]}
      >
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={220}
            animation="wave"
            sx={{ borderRadius: 3 }}
          />
        ))}
      </Box>
    );
  }

  if (variant === "table") {
    return (
      <Stack spacing={1.25} sx={sx}>
        <Skeleton variant="rounded" height={48} animation="wave" sx={{ borderRadius: 2 }} />
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton
            key={i}
            variant="rounded"
            height={56}
            animation="wave"
            sx={{ borderRadius: 2 }}
          />
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.25} sx={sx}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={72}
          animation="wave"
          sx={{ borderRadius: 2 }}
        />
      ))}
    </Stack>
  );
}

import React, { useState } from 'react';
import { Box, Typography, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip, IconButton } from '@mui/material';
import { Add, Edit, Delete } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { mockListeningContents } from '../mockData';

const ListeningManagePage = () => {
  const navigate = useNavigate();
  // Using mock data for UI preview
  const [contents, setContents] = useState(mockListeningContents);

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this content?')) {
      setContents(contents.filter(c => c._id !== id));
    }
  };

  return (
    <Box sx={{ p: 4 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ color: '#B90000' }}>
          Listening Content Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/dashboard/admin/listening/new')}
          sx={{
            bgcolor: '#B90000',
            color: 'white',
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            '&:hover': { bgcolor: '#990000' }
          }}
        >
          Add New Content
        </Button>
      </Box>

      <TableContainer component={Paper} sx={{ borderRadius: '16px', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#f9f9f9' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Title</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Topic</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Level</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Source</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {contents.map((content) => (
              <TableRow key={content._id} hover>
                <TableCell>{content.title}</TableCell>
                <TableCell>
                  <Chip label={content.topic} size="small" sx={{ bgcolor: '#ffedd5', color: '#c2410c', fontWeight: 'bold' }} />
                </TableCell>
                <TableCell>
                  <Chip label={content.level} size="small" sx={{ bgcolor: '#fecaca', color: '#B90000', fontWeight: 'bold' }} />
                </TableCell>
                <TableCell>
                  <Chip label={content.audioSource.toUpperCase()} size="small" variant="outlined" />
                </TableCell>
                <TableCell>
                  <IconButton onClick={() => navigate(`/dashboard/admin/listening/${content._id}/edit`)} sx={{ color: 'primary.main', mr: 1 }}>
                    <Edit />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(content._id)} sx={{ color: 'error.main' }}>
                    <Delete />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {contents.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                  No listening content found. Click "Add New Content" to create one.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
};

export default ListeningManagePage;

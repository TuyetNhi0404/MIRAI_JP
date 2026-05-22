import React, { useState, useEffect } from 'react';
import { Box, Typography, TextField, Button, Paper, Grid, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import { ArrowBack, Save } from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { mockListeningContents } from '../mockData';

const ListeningFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    topic: 'daily_life',
    level: 'N5',
    audioSource: 'upload',
    audioUrl: '',
    transcript: '',
  });

  useEffect(() => {
    if (isEditMode) {
      const existing = mockListeningContents.find(c => c._id === id);
      if (existing) {
        setFormData({
          title: existing.title,
          description: existing.description,
          topic: existing.topic,
          level: existing.level,
          audioSource: existing.audioSource,
          audioUrl: existing.audioUrl,
          transcript: existing.transcript,
        });
      }
    }
  }, [id, isEditMode]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | { name?: string; value: unknown }>) => {
    const name = e.target.name as string;
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [name]: value }));
  };



  const handleSave = () => {
    const payload = {
      ...formData,
    };
    console.log('Submit payload:', payload);
    alert('Content saved successfully! (Mock Action)');
    navigate('/dashboard/admin/listening');
  };

  return (
    <Box sx={{ p: 4, maxWidth: 900, mx: 'auto' }}>
      <Button 
        startIcon={<ArrowBack />} 
        onClick={() => navigate('/dashboard/admin/listening')}
        sx={{ mb: 3, color: 'text.secondary', fontWeight: 'bold' }}
      >
        Back to List
      </Button>

      <Typography variant="h4" fontWeight="bold" sx={{ color: '#B90000', mb: 4 }}>
        {isEditMode ? 'Edit Listening Content' : 'Create New Listening Content'}
      </Typography>

      <Paper sx={{ p: 4, borderRadius: '16px', boxShadow: '0 8px 32px rgba(0,0,0,0.05)' }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Topic</InputLabel>
              <Select name="topic" value={formData.topic} onChange={handleChange as any} label="Topic">
                <MenuItem value="daily_life">Daily Life</MenuItem>
                <MenuItem value="travel">Travel</MenuItem>
                <MenuItem value="business">Business</MenuItem>
                <MenuItem value="culture">Culture</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select name="level" value={formData.level} onChange={handleChange as any} label="Level">
                <MenuItem value="N5">N5</MenuItem>
                <MenuItem value="N4">N4</MenuItem>
                <MenuItem value="N3">N3</MenuItem>
                <MenuItem value="N2">N2</MenuItem>
                <MenuItem value="N1">N1</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Audio Source</InputLabel>
              <Select name="audioSource" value={formData.audioSource} onChange={handleChange as any} label="Audio Source">
                <MenuItem value="upload">Upload File (Cloudinary)</MenuItem>
                <MenuItem value="tts">Text-to-Speech (ElevenLabs)</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Audio URL"
              name="audioUrl"
              value={formData.audioUrl}
              onChange={handleChange}
              variant="outlined"
              placeholder="https://..."
            />
          </Grid>



          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={5}
              label="Transcript (Japanese)"
              name="transcript"
              value={formData.transcript}
              onChange={handleChange}
              variant="outlined"
            />
          </Grid>

          <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
            <Button
              variant="contained"
              startIcon={<Save />}
              onClick={handleSave}
              sx={{
                bgcolor: '#B90000',
                color: 'white',
                px: 4,
                py: 1.5,
                borderRadius: '12px',
                fontWeight: 'bold',
                textTransform: 'none',
                '&:hover': { bgcolor: '#990000' }
              }}
            >
              Save Content
            </Button>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default ListeningFormPage;

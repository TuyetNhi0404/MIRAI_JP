import { Request, Response } from 'express';
import ListeningContent from '../model/listeningContent.model';
import ListeningExercise from '../model/listeningExercise.model';
import ListeningResult from '../model/listeningResult.model';
import { uploadAudioToCloudinary } from '../service/cloudinaryAudio.service';

export const createContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, topic, level, audioSource, audioUrl, transcript } = req.body;
    const createdBy = (req as any).user?.id || (req as any).id;

    if (!createdBy) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const source = audioSource === 'tts' ? 'tts' : 'upload';
    const resolvedAudioUrl =
      typeof audioUrl === 'string' ? audioUrl.trim() : '';

    if (source === 'tts' && !resolvedAudioUrl) {
      res.status(400).json({ message: 'audioUrl is required when audio source is TTS' });
      return;
    }

    const newContent = await ListeningContent.create({
      title,
      description: description ?? '',
      topic,
      level,
      audioSource: source,
      audioUrl: source === 'upload' ? '' : resolvedAudioUrl,
      transcript,
      createdBy,
    });

    res.status(201).json(newContent);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getAllContents = async (req: Request, res: Response): Promise<void> => {
  try {
    const { topic, level, page = 1, limit = 10 } = req.query;
    const userRole = (req as any).user?.role;
    const query: any = {};

    if (topic) query.topic = topic;
    if (level) query.level = level;

    if (userRole !== 'admin') {
      query.isPublished = true;
    }

    const contents = await ListeningContent.find(query)
      .populate('createdBy', 'name email')
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .sort({ createdAt: -1 });

    const total = await ListeningContent.countDocuments(query);

    res.status(200).json({ contents, total, page: Number(page), limit: Number(limit) });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const getContentById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const content = await ListeningContent.findById(id).populate('exercises');

    if (!content) {
      res.status(404).json({ message: 'Content not found' });
      return;
    }

    // Increment play count if accessed (Optional: could restrict to student only)
    content.playCount += 1;
    await content.save();

    res.status(200).json(content);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const updateContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const updatedContent = await ListeningContent.findByIdAndUpdate(id, req.body, { new: true });

    if (!updatedContent) {
      res.status(404).json({ message: 'Content not found' });
      return;
    }

    res.status(200).json(updatedContent);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const deleteContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const deletedContent = await ListeningContent.findByIdAndDelete(id);

    if (!deletedContent) {
      res.status(404).json({ message: 'Content not found' });
      return;
    }

    // Also delete associated exercises
    await ListeningExercise.deleteMany({ contentId: id });

    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const uploadAudio = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const file = req.file;
    if (!file?.buffer?.length) {
      res.status(400).json({
        message: 'No audio file provided',
        hint: 'Send multipart field name "audio" with the file body',
      });
      return;
    }

    const content = await ListeningContent.findById(id);
    if (!content) {
      res.status(404).json({ message: 'Content not found' });
      return;
    }

    const audioUrl = await uploadAudioToCloudinary(file.buffer);
    content.audioUrl = audioUrl;
    content.audioSource = 'upload';
    await content.save();

    res.status(200).json({
      message: 'Audio uploaded successfully',
      audioUrl,
      content,
    });
  } catch (error: any) {
    console.error('uploadAudio error:', error);
    res.status(500).json({ message: error.message || 'Failed to upload audio to Cloudinary' });
  }
};

export const addExercise = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // contentId
    const exerciseData = { ...req.body, contentId: id };

    const newExercise = await ListeningExercise.create(exerciseData);

    await ListeningContent.findByIdAndUpdate(id, {
      $push: { exercises: newExercise._id }
    });

    res.status(201).json(newExercise);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

export const submitAnswers = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params; // contentId
    const { answers, timeSpent } = req.body;
    const studentId = (req as any).user?.id || (req as any).id;

    if (!studentId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    let totalScore = 0;
    const evaluatedAnswers = [];

    // Evaluate answers
    for (const ans of answers) {
      const exercise = await ListeningExercise.findById(ans.exerciseId);
      if (!exercise) continue;

      let isCorrect = false;
      let score = 0;

      if (exercise.type === 'quiz' && exercise.correctAnswer === ans.studentAnswer) {
        isCorrect = true;
        score = 1;
      } else if (exercise.type === 'fill_blank') {
        // Simple logic for fill blank, assuming studentAnswer is comma separated or exact match
        if (exercise.answers?.join(',') === ans.studentAnswer) {
          isCorrect = true;
          score = 1;
        }
      } else if (exercise.type === 'dictation') {
        // Placeholder for dictation logic (Phase 2 Levenshtein)
        if (exercise.targetText === ans.studentAnswer) {
          isCorrect = true;
          score = 1;
        }
      }

      totalScore += score;
      evaluatedAnswers.push({
        exerciseId: exercise._id,
        studentAnswer: ans.studentAnswer,
        isCorrect,
        score
      });
    }

    const result = await ListeningResult.create({
      studentId,
      contentId: id,
      answers: evaluatedAnswers,
      totalScore,
      maxScore: answers.length,
      timeSpent
    });

    res.status(201).json(result);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
};

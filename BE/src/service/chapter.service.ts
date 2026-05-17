import { Chapter, IChapter } from "../model/chapter.model";

class ChapterService {
  async createChapter(payload: { name: string; description?: string }): Promise<IChapter> {
    const exists = await Chapter.findOne({ name: payload.name.trim() });
    if (exists) throw new Error("Chapter name already exists");
    const chapter = new Chapter({ name: payload.name.trim(), description: payload.description });
    return chapter.save();
  }

  async listChapters(): Promise<IChapter[]> {
    return Chapter.find().sort({ createdAt: -1 });
  }

  async getChapterById(id: string): Promise<IChapter | null> {
    return Chapter.findById(id);
  }

  async updateChapter(id: string, data: Partial<IChapter>): Promise<IChapter | null> {
    return Chapter.findByIdAndUpdate(id, data, { new: true });
  }

  async deleteChapter(id: string): Promise<void> {
    await Chapter.findByIdAndDelete(id);
  }
}

export default new ChapterService();



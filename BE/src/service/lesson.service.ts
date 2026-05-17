import Lesson, { ILesson } from "../model/lesson.model";

export class LessonService {
  static async create(data: Partial<ILesson>) {
    const lesson = new Lesson(data);
    return await lesson.save();
  }

  static async getAll() {
    return await Lesson.find().populate("courseId");
  }

  static async getById(id: string) {
    return await Lesson.findById(id).populate("courseId");
  }

  static async update(id: string, data: Partial<ILesson>) {
    return await Lesson.findByIdAndUpdate(id, data, { new: true });
  }

  static async remove(id: string) {
    return await Lesson.findByIdAndDelete(id);
  }
}

import { Course, ICourse } from "../model/course.model";

export class CourseService {
  static async create(data: Partial<ICourse>) {
    const course = new Course(data);
    return await course.save();
  }

  static async getAll() {
    return await Course.find();
  }

  static async getById(id: string) {
    return await Course.findById(id);
  }

  static async update(id: string, data: Partial<ICourse>) {
    return await Course.findByIdAndUpdate(id, data, { new: true });
  }

  static async remove(id: string) {
    return await Course.findByIdAndDelete(id);
  }
}

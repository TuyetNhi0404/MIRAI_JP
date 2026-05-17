import { Assignment, IAssignment } from "../model/assignment.model";

export const createAssignment = async (data: Partial<IAssignment>) => {
  const assignment = new Assignment(data);
  return await assignment.save();
};

export const getAssignmentsByCourse = async (courseId: string) => {
  return await Assignment.find({ courseId }).populate("createdBy", "name email");
};

export const getAssignmentById = async (id: string) => {
  return await Assignment.findById(id);
};

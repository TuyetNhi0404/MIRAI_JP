import adminService from "../service/admin.service";
import { Request, Response } from "express";
import { User } from "../model/user.model";

class AdminController {
  async getAll(req: Request, res: Response) {
    try {
      const { role, status, search, page = "1", limit = "100" } = req.query;

      const result = await adminService.getAllUsers({
        role: role as string,
        status: status as string,
        search: search as string,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
      });

      return res.json(result);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  async createUser(req: Request, res: Response) {
    try {
      const { name, email, role } = req.body;
      const user = await adminService.createUserWithRole({ name, email, role });
      return res.status(201).json({
        message: "User created successfully",
        user,
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  async lockUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await adminService.lockUser(id as string);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  async unlockUser(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await adminService.unlockUser(id as string);
      return res.json(result);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }


  async getUserLastLogin(req: Request, res: Response) {
    try {
      const users = await adminService.getUserLastLogin();
      return res.json({
        message: "List of users and their latest login",
        users,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  async getTeachers(req: Request, res: Response) {
    try {
      const teachers = await adminService.getTeachers();
      return res.status(200).json({
        message: "List of teachers successfully retrieved.",
        data: teachers,
      });
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }
}


export default new AdminController();

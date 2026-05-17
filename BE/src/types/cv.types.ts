interface Education {
  institution: string;
  period: string;
  major: string;
  gpa: string;
}

export interface CVInfo {
  name: string;
  email: string;
  birthday: string;
  phone: string;
  education: Education;
  experience: string;
  skills: string[];
  certifications: string[];
  projects: Object[];
}

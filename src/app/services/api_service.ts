import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  type: string;
  duration: string;
  rhythm: string;
  description: string;
  skills_required: string[];
  soft_skills: string[];
  education_level: string;
  salary: string;
  benefits: string[];
  company_size: string;
  sector: string;
  posted_date: string;
  contact_email: string;
  application_url?: string;
  team?: string;
  projects?: string[];
  tech_stack?: {
    [key: string]: string[];
  };
  interview_process?: string[];
  start_date?: string;
  remote_policy?: string;
  office_location?: string;
  company_culture?: string;
}

export interface JobMatch {
  job_id: string;
  score: number;
  reasons: string[];
  concerns: string[];
  job?: Job;
}

export interface UserProfile {
  skills: string[];
  location?: string;
  education?: string;
  preferences?: string;
  experience?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = 'http://localhost:3000';

  constructor(private http: HttpClient) {}

  // Chat
  sendMessage(prompt: string): Observable<{ answer: string }> {
    return this.http.post<{ answer: string }>(`${this.baseUrl}/chat`, { prompt });
  }

  // Jobs
  getAllJobs(): Observable<{ jobs: Job[] }> {
    return this.http.get<{ jobs: Job[] }>(`${this.baseUrl}/jobs`);
  }

  getJobById(id: string): Observable<{ job: Job }> {
    return this.http.get<{ job: Job }>(`${this.baseUrl}/jobs/${id}`);
  }

  searchJobs(filters: { skills?: string[], location?: string, type?: string }): Observable<{ jobs: Job[], count: number }> {
    return this.http.post<{ jobs: Job[], count: number }>(`${this.baseUrl}/jobs/search`, filters);
  }

  matchJobs(userProfile: UserProfile, topN: number = 3): Observable<{ matches: JobMatch[] }> {
    return this.http.post<{ matches: JobMatch[] }>(`${this.baseUrl}/jobs/match`, { userProfile, topN });
  }

  sendSmartMessage(conversation: any[], message: string, userProfile?: UserProfile) {
    return this.http.post<any>(`${this.baseUrl}/chat-smart`, {
      conversation,
      message,
      userProfile
    });
  }
}
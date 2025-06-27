import axios, { AxiosInstance } from 'axios';

// Create API instance suitable for current environment
const getApiInstance = (): AxiosInstance => {
    // Check if it's server-side environment
    const isServer = typeof window === 'undefined';

    const instance = axios.create({
        baseURL: process.env.NEXT_PUBLIC_API_URL,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Add request interceptor
    instance.interceptors.request.use((config) => {
        console.log(`[API Request] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`,
            config.params || {}, config.data || {});
        return config;
    });

    // Add response interceptor
    instance.interceptors.response.use(
        (response) => {
            console.log(`[API Response] ${response.status} ${response.config.url}`,
                { data: response.data });
            return response;
        },
        (error) => {
            console.error(`[API Error] ${error.config?.url || 'unknown url'}`, {
                status: error.response?.status,
                statusText: error.response?.statusText,
                data: error.response?.data,
                message: error.message
            });
            return Promise.reject(error);
        }
    );

    return instance;
};

// Project type definition
export interface Project {
    id: number;
    name: string;
    owner: string;
    full_name: string;
    description: string;
    language: string;
    repository_url: string;
    homepage_url?: string;
    stars_count: number;
    forks_count: number;
    trending_date: string;
}

// Project insight type definition
export interface ProjectInsight {
    id: number;
    project_id: number;
    business_value: string;
    market_opportunity: string;
    startup_ideas: string;
    target_audience: string;
    competition_analysis: string;
    created_at: string;
    analysis_version: string;
    analysis_status?: string;
    language: string;
}

// Paginated response type
export interface PaginatedResponse<T> {
    total: number;
    limit: number;
    offset: number;
    data: T[];
    message?: string; // Optional hint message for server-side limit hints
}

// API methods
export const apiService = {
    // Get project list
    async getProjects(params?: {
        search?: string;
        language?: string;
        days?: number;
        limit?: number;
        offset?: number;
    }): Promise<PaginatedResponse<Project>> {
        try {
            console.log('[apiService.getProjects] Start request', { params });
            const api = getApiInstance();
            const response = await api.get('/api/v1/projects', { params });
            console.log('[apiService.getProjects] Request successful', {
                total: response.data.total,
                count: response.data.data.length
            });
            return response.data;
        } catch (error) {
            console.error('[apiService.getProjects] Request failed:', error);
            throw error;
        }
    },



    // Get language list
    async getLanguages(): Promise<{ language: string; count: number }[]> {
        try {
            console.log('[apiService.getLanguages] Start request');
            const api = getApiInstance();
            const response = await api.get('/api/v1/languages');
            console.log('[apiService.getLanguages] Request successful', {
                count: response.data.length,
                languages: response.data.map(l => l.language).slice(0, 5) // Only show first 5 languages
            });
            return response.data;
        } catch (error) {
            console.error('[apiService.getLanguages] Get language list failed:', error);
            throw error;
        }
    },

    // Get single project by owner/repo format
    async getProjectByName(owner: string, repo: string): Promise<Project> {
        try {
            console.log('[apiService.getProjectByName] Start request', { owner, repo });
            const api = getApiInstance();
            const response = await api.get(`/api/v1/${owner}/${repo}`);
            console.log('[apiService.getProjectByName] Request successful', {
                id: response.data.id,
                name: response.data.full_name
            });
            return response.data;
        } catch (error) {
            console.error(`[apiService.getProjectByName] Get project ${owner}/${repo} failed:`, error);
            throw error;
        }
    },

    // Get project insights by owner/repo format
    async getProjectInsightByName(owner: string, repo: string, language?: string): Promise<ProjectInsight> {
        try {
            console.log('[apiService.getProjectInsightByName] Start request', { owner, repo, language });
            const api = getApiInstance();
            const response = await api.get(`/api/v1/${owner}/${repo}/insights`, {
                params: { language }
            });
            console.log('[apiService.getProjectInsightByName] Request successful', {
                id: response.data.id,
                project_id: response.data.project_id,
                status: response.data.analysis_status || 'completed'
            });
            return response.data;
        } catch (error) {
            console.error(`[apiService.getProjectInsightByName] Get project ${owner}/${repo} insight failed:`, error);
            throw error;
        }
    },
};

export default apiService; 
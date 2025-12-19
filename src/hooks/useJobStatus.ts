// src/hooks/useJobStatus.ts
import { useQuery } from "@tanstack/react-query";
import { api } from "../services/api";

type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";

interface JobResponse {
  id: string;
  status: JobStatus;
  resultUrl?: string; // L'URL de l'image/PDF généré
}

export const useJobStatus = (jobId: string | null) => {
  return useQuery({
    queryKey: ["job", jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const { data } = await api.get<JobResponse>(`/jobs/${jobId}`);
      return data;
    },
    // C'est ici que la magie opère :
    enabled: !!jobId, // Ne lance la requête que si on a un ID
    refetchInterval: (query) => {
      const status = query.state.data?.status;

      // Si c'est fini ou échoué, on arrête de poller
      if (status === "COMPLETED" || status === "FAILED") {
        return false;
      }

      // Stratégie simple : Toutes les 2s tant que ça tourne.
      // Tu pourrais faire varier ça si tu voulais être plus agressif au début.
      return 2000;
    },
    // Pas besoin de garder ça en cache longtemps si on quitte l'écran
    gcTime: 0,
  });
};

import { View, Text, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { memo } from "react";

const JobCardComponent = ({ job }: { job: any }) => {
  const isPending = job.status === "PENDING" || job.status === "PROCESSING";
  const isFailed = job.status === "FAILED";
  const isCompleted = job.status === "COMPLETED";

  return (
    <View
      className={`mb-4 rounded-xl border p-4 ${
        isFailed
          ? "bg-red-500/5 border-red-500/20"
          : "bg-surface border-zinc-800"
      }`}
    >
      {/* HEADER : Date + Badge */}
      <View className="flex-row justify-between items-start mb-2">
        <View className="flex-row items-center">
          <View
            className={`w-2 h-2 rounded-full mr-2 ${
              isPending
                ? "bg-yellow-500"
                : isFailed
                  ? "bg-red-500"
                  : "bg-green-500"
            }`}
          />
          <Text className="text-zinc-400 text-xs font-medium">
            {format(new Date(job.createdAt), "dd MMM à HH:mm", { locale: fr })}
          </Text>
        </View>

        {/* LE BADGE DE STATUT */}
        <View
          className={`px-2 py-1 rounded-md flex-row items-center space-x-1 ${
            isPending
              ? "bg-yellow-500/10"
              : isFailed
                ? "bg-red-500/10"
                : "bg-green-500/10"
          }`}
        >
          {isFailed && (
            <Ionicons
              name="return-down-back"
              size={10}
              color="#ef4444"
              style={{ marginRight: 4 }}
            />
          )}
          <Text
            className={`text-[10px] font-bold uppercase ${
              isPending
                ? "text-yellow-500"
                : isFailed
                  ? "text-red-500"
                  : "text-green-500"
            }`}
          >
            {isPending ? "En cours" : isFailed ? "Remboursé" : "Terminé"}
          </Text>
        </View>
      </View>

      {/* CONTENU */}
      <View className="mt-2">
        {isPending ? (
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#fbbf24" className="mr-2" />
            <Text className="text-zinc-300 text-sm">
              IA en cours de réflexion...
            </Text>
          </View>
        ) : isFailed ? (
          <View>
            {/* Titre de l'erreur */}
            <Text className="text-red-400 font-bold text-base mb-1">
              Échec de l'analyse
            </Text>
            {/* Message d'erreur (venant de la DB) */}
            <Text className="text-red-400/70 text-xs" numberOfLines={2}>
              {job.error || "Une erreur technique est survenue."}
            </Text>
          </View>
        ) : (
          <View>
            <Text
              className="text-white font-medium text-lg mb-1"
              numberOfLines={1}
            >
              {job.result?.structured_report?.project_name ||
                "Analyse terminée"}
            </Text>
            <Text className="text-zinc-400 text-sm" numberOfLines={2}>
              {job.result?.structured_report?.general_notes ||
                "Cliquez pour voir le rapport complet."}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

// Mémoïsation du composant pour éviter les re-renders inutiles lors du polling
// Ne se re-render que si l'id ou le status du job change
export const JobCard = memo(JobCardComponent, (prevProps, nextProps) => {
  return (
    prevProps.job.id === nextProps.job.id &&
    prevProps.job.status === nextProps.job.status &&
    prevProps.job.createdAt === nextProps.job.createdAt
  );
});

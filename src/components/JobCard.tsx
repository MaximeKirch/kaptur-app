import { View, Text, ActivityIndicator, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns"; // Installe date-fns si tu l'as pas: npm install date-fns

export const JobCard = ({ job }: { job: any }) => {
  const isPending = job.status === "PENDING" || job.status === "PROCESSING";
  const isFailed = job.status === "FAILED";

  return (
    <View className="bg-surface mb-4 rounded-xl border border-zinc-800 p-4">
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
            {format(new Date(job.createdAt), "dd MMM à HH:mm")}
          </Text>
        </View>

        {/* Badge de statut */}
        <View
          className={`px-2 py-1 rounded-md ${
            isPending
              ? "bg-yellow-500/10"
              : isFailed
                ? "bg-red-500/10"
                : "bg-green-500/10"
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isPending
                ? "text-yellow-500"
                : isFailed
                  ? "text-red-500"
                  : "text-green-500"
            }`}
          >
            {job.status}
          </Text>
        </View>
      </View>

      {/* Contenu */}
      <View className="mt-2">
        {isPending ? (
          <View className="flex-row items-center">
            <ActivityIndicator size="small" color="#fbbf24" className="mr-2" />
            <Text className="text-zinc-300">Analyse en cours par l'IA...</Text>
          </View>
        ) : isFailed ? (
          <Text className="text-red-400">
            Une erreur est survenue lors de l'analyse.
          </Text>
        ) : (
          <View>
            <Text
              className="text-white font-medium text-lg mb-1"
              numberOfLines={1}
            >
              {/* On suppose que ton JSON result contient un "title" ou "summary" */}
              {job.result?.structured_report.project_name || "Analyse terminée"}
            </Text>
            <Text className="text-zinc-400 text-sm" numberOfLines={2}>
              {job.result?.summary || "Cliquez pour voir les détails..."}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

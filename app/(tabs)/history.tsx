import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Pressable,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../src/services/api";
import { JobCard } from "../../src/components/JobCard";
import { useRouter, Href } from "expo-router"; // <--- Import Href pour le typage

export default function HistoryScreen() {
  const router = useRouter();

  const {
    data: jobs,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["my-jobs"],
    queryFn: async () => {
      const res = await api.get("/jobs/");
      return res.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;
      const hasPendingJobs = data.some(
        (job: any) => job.status === "PENDING" || job.status === "PROCESSING",
      );
      // On ralentit un peu le polling (3s) pour être gentil avec le serveur
      return hasPendingJobs ? 3000 : false;
    },
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 px-6 pt-6">
        <Text className="text-3xl font-bold text-white mb-6">Mes Analyses</Text>

        {isLoading ? (
          <View className="flex-1 justify-center items-center">
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : jobs?.length === 0 ? (
          <View className="flex-1 justify-center items-center opacity-50">
            <Text className="text-zinc-500 text-lg">
              Aucune analyse pour le moment
            </Text>
          </View>
        ) : (
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                className="active:opacity-70"
                onPress={() =>
                  // ON CHANGE ICI : On construit l'URL manuellement
                  router.push(`/job/${item.id}` as Href)
                }
              >
                <JobCard job={item} />
              </Pressable>
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                tintColor="#fff"
              />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

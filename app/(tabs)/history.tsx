import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Pressable,
} from "react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../src/services/api";
import { JobCard } from "../../src/components/JobCard";
import { useRouter, Href } from "expo-router";
import { useMe } from "../../src/hooks/useMe";
import { useRef } from "react";

export default function HistoryScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const wasPendingRef = useRef(false);

  const { refetch: refetchUser } = useMe();

  const {
    data: jobs,
    isLoading,
    refetch: refetchJobs,
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

      return hasPendingJobs ? 3000 : false;
    },
  });

  const handleRefresh = async () => {
    await Promise.all([refetchJobs(), refetchUser()]);
  };

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
                onPress={() => router.push(`/job/${item.id}` as Href)}
              >
                <JobCard job={item} />
              </Pressable>
            )}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
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

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
import { useRef, useEffect, useCallback } from "react";

interface Job {
  id: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  result?: any;
  error?: string;
}

export default function HistoryScreen() {
  const router = useRouter();
  const wasPendingRef = useRef(false);

  const { refetch: refetchUser } = useMe();

  const {
    data: jobsRaw,
    isLoading,
    refetch: refetchJobs,
    isRefetching,
  } = useQuery<Job[]>({
    queryKey: ["my-jobs"],
    queryFn: async () => {
      const res = await api.get("/jobs/");
      return res.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      if (!data) return false;

      const hasPendingJobs = data.some(
        (job) => job.status === "PENDING" || job.status === "PROCESSING",
      );

      return hasPendingJobs ? 3000 : false;
    },
  });

  // Trier les jobs de manière stable pour éviter les sauts visuels lors du polling
  // Ordre : date décroissante (plus récent en premier)
  const jobs = jobsRaw
    ? [...jobsRaw].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      )
    : [];

  // --- REMPLACEMENT : Gestion des effets de bord ---
  useEffect(() => {
    if (!jobsRaw) return;

    // 1. On regarde s'il y a des jobs en cours MAINTENANT
    const hasPending = jobsRaw.some(
      (j) => j.status === "PENDING" || j.status === "PROCESSING",
    );

    // 2. Logique de transition : Si AVANT c'était en cours, et MAINTENANT c'est fini
    if (wasPendingRef.current && !hasPending) {
      console.log(
        "🔄 Jobs finished (Success or Failed), refreshing credits...",
      );
      refetchUser();
    }

    // 3. On met à jour la référence pour le prochain rendu
    wasPendingRef.current = hasPending;
  }, [jobsRaw, refetchUser]);

  const handleRefresh = async () => {
    await Promise.all([refetchJobs(), refetchUser()]);
  };

  // Mémoïser le renderItem pour éviter de recréer la fonction à chaque render
  const renderItem = useCallback(
    ({ item }: { item: Job }) => (
      <Pressable
        className="active:opacity-70"
        onPress={() => router.push(`/job/${item.id}` as Href)}
      >
        <JobCard job={item} />
      </Pressable>
    ),
    [router],
  );

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
            renderItem={renderItem}
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={handleRefresh}
                tintColor="#fff"
              />
            }
            contentContainerStyle={{ paddingBottom: 100 }}
            // Optimisations de performance pour éviter les glitches lors du polling
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            initialNumToRender={10}
            windowSize={10}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

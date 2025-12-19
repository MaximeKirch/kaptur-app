import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { useEffect, useState } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Share,
  Platform,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

import { api } from "../../src/services/api";

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<
    "report" | "transcript" | "editor"
  >("report");

  const [editableText, setEditableText] = useState("");

  // Récupération du job unique
  const {
    data: job,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}`); // Assure-toi que cette route existe sur ton backend (getJobStatus)
      return res.data;
    },
    enabled: !!id,
  });

  const handleCopy = async (text: string) => {
    await Clipboard.setStringAsync(text);
    // Tu pourrais ajouter un petit Toast ici
  };

  const handleShare = async () => {
    // On partage ce qui est actuellement dans l'éditeur (donc tes modifs sont prises en compte)
    const messageToShare =
      activeTab === "editor"
        ? editableText
        : job?.result?.structured_report?.formatted_report ||
          job?.result?.raw_transcription;

    if (!messageToShare) return;

    try {
      await Share.share({
        message: messageToShare,
        title: "Rapport Kaptur",
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (job?.result?.structured_report?.formatted_report) {
      setEditableText(job.result.structured_report.formatted_report);
    } else if (job?.result?.raw_transcription) {
      setEditableText(job.result.raw_transcription);
    }
  }, [job]);

  if (isLoading) {
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View className="flex-1 bg-background justify-center items-center px-6">
        <Ionicons name="alert-circle" size={48} color="#ef4444" />
        <Text className="text-white text-lg font-bold mt-4">
          Erreur de chargement
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-6 bg-zinc-800 px-6 py-3 rounded-full"
        >
          <Text className="text-white">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isCompleted = job.status === "COMPLETED";
  const report = job.result || {};

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-zinc-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text className="text-white font-bold text-lg">Détail Analyse</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1">
        {/* INFO BASE */}
        <View className="p-6">
          <View className="flex-row justify-between items-start mb-4">
            <View>
              <Text className="text-zinc-400 text-sm mb-1">
                Date de création
              </Text>
              <Text className="text-white font-medium text-lg">
                {format(new Date(job.createdAt), "dd MMM yyyy à HH:mm", {
                  locale: fr,
                })}
              </Text>
            </View>
            <View
              className={`px-3 py-1.5 rounded-full ${
                isCompleted ? "bg-green-500/10" : "bg-yellow-500/10"
              }`}
            >
              <Text
                className={`text-xs font-bold ${
                  isCompleted ? "text-green-500" : "text-yellow-500"
                }`}
              >
                {job.status}
              </Text>
            </View>
          </View>

          {/* ONGLETS DE NAVIGATION */}
          {isCompleted && (
            <View className="flex-row bg-zinc-900 p-1 rounded-xl mb-6">
              {["report", "transcript", "editor"].map((tab) => (
                <TouchableOpacity
                  key={tab}
                  onPress={() => setActiveTab(tab as any)}
                  className={`flex-1 py-2 rounded-lg items-center ${
                    activeTab === tab ? "bg-zinc-700" : ""
                  }`}
                >
                  <Text
                    className={`font-medium text-xs ${
                      activeTab === tab ? "text-white" : "text-zinc-500"
                    }`}
                  >
                    {tab === "report"
                      ? "Synthèse"
                      : tab === "transcript"
                        ? "Texte Brut"
                        : "Éditeur"}{" "}
                    {/* Renommé ici */}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* CONTENU DES ONGLETS */}
          {isCompleted ? (
            <View>
              {/* TAB 1: SYNTHÈSE (STRUCTURED REPORT) */}
              {activeTab === "report" && (
                <View className="gap-4">
                  {/* Adapte cet affichage selon la structure exacte de ton JSON */}
                  <View className="bg-surface p-4 rounded-xl border border-zinc-800">
                    <Text className="text-primary font-bold mb-2 uppercase text-xs tracking-wider">
                      Titre / Sujet
                    </Text>
                    <Text className="text-white text-lg font-bold leading-6">
                      {report.structured_report.project_name || "Analyse Audio"}
                    </Text>
                  </View>

                  <View className="bg-surface p-4 rounded-xl border border-zinc-800">
                    <Text className="text-primary font-bold mb-2 uppercase text-xs tracking-wider">
                      Résumé
                    </Text>
                    <Text className="text-zinc-300 leading-6">
                      {report.structured_report?.formatted_report ||
                        "Aucun résumé disponible."}
                    </Text>
                  </View>

                  {/* Exemple pour des points clés si ton JSON en a */}
                  {report.structured_report?.trades && (
                    <View className="bg-surface p-4 rounded-xl border border-zinc-800">
                      <Text className="text-primary font-bold mb-4 uppercase text-xs tracking-wider">
                        Points Clés par Lot
                      </Text>

                      {report.structured_report.trades.map(
                        (trade: any, index: number) => (
                          <View key={index} className="mb-5 last:mb-0">
                            {/* 1. Titre du métier (ex: Électricité) */}
                            <View className="flex-row items-center mb-2">
                              <View className="w-1 h-4 bg-primary rounded-full mr-2" />
                              <Text className="font-bold text-white text-base">
                                {trade.trade_name}
                              </Text>
                            </View>

                            {/* 2. Liste des tâches pour ce métier */}
                            <View className="pl-3 border-l border-zinc-800 ml-0.5 space-y-3">
                              {Array.isArray(trade.tasks) &&
                                trade.tasks.map((task: any, tIndex: number) => (
                                  <View key={tIndex}>
                                    {/* La Description principale */}
                                    <Text className="text-zinc-300 text-sm leading-5">
                                      {task.description}
                                    </Text>

                                    {/* Les métadonnées (Date / Statut) en petit en dessous */}
                                    {(task.status || task.deadline) && (
                                      <View className="flex-row items-center mt-1 space-x-2">
                                        {task.status && (
                                          <Text className="text-[10px] uppercase font-bold text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">
                                            {task.status}
                                          </Text>
                                        )}
                                        {task.deadline && (
                                          <Text className="text-[10px] text-red-400">
                                            📅 {task.deadline}
                                          </Text>
                                        )}
                                      </View>
                                    )}
                                  </View>
                                ))}
                            </View>
                          </View>
                        ),
                      )}
                    </View>
                  )}
                </View>
              )}

              {/* TAB 2: TRANSCRIPTION BRUTE */}
              {activeTab === "transcript" && (
                <View className="bg-surface p-4 rounded-xl border border-zinc-800">
                  <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-zinc-400 text-xs uppercase font-bold">
                      Transcription intégrale
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleCopy(job.result.raw_transcription)}
                    >
                      <Ionicons name="copy-outline" size={16} color="#a1a1aa" />
                    </TouchableOpacity>
                  </View>
                  <Text className="text-zinc-300 leading-7 font-mono text-sm">
                    {job.result.raw_transcription}
                  </Text>
                </View>
              )}

              {/* TAB 3: ÉDITEUR MARKDOWN */}
              {activeTab === "editor" && (
                <KeyboardAvoidingView
                  behavior={Platform.OS === "ios" ? "padding" : "height"}
                >
                  <View className="bg-surface rounded-xl border border-zinc-800 overflow-hidden">
                    {/* Toolbar simple */}
                    <View className="flex-row justify-between items-center px-4 py-2 bg-zinc-900 border-b border-zinc-800">
                      <TouchableOpacity
                        onPress={() => handleCopy(editableText)}
                      >
                        <Text className="text-primary text-xs font-bold ">
                          Copier tout
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Zone de texte */}
                    <TextInput
                      multiline
                      value={editableText}
                      onChangeText={setEditableText}
                      textAlignVertical="top"
                      style={{
                        fontFamily:
                          Platform.OS === "ios" ? "Menlo" : "monospace",
                        minHeight: 300, // Hauteur minimale confortable
                      }}
                      className="text-zinc-300 p-4 text-sm leading-6"
                      placeholder="Le rapport est vide..."
                      placeholderTextColor="#52525b"
                    />
                  </View>

                  <Text className="text-zinc-600 text-xs text-center mt-4 px-4">
                    💡 Vous pouvez modifier ce texte avant de le partager. Les
                    modifications sont locales et ne changent pas l'analyse
                    d'origine.
                  </Text>

                  {/* Bouton d'action rapide en bas de l'éditeur */}
                  <TouchableOpacity
                    onPress={handleShare}
                    className="mt-6 w-full bg-primary py-4 rounded-xl items-center flex-row justify-center"
                  >
                    <Ionicons
                      name="share-social"
                      size={20}
                      color="white"
                      style={{ marginRight: 8 }}
                    />
                    <Text className="text-white font-bold">
                      Partager le rapport
                    </Text>
                  </TouchableOpacity>
                </KeyboardAvoidingView>
              )}
            </View>
          ) : (
            // SI LE JOB N'EST PAS ENCORE FINI
            <View className="items-center py-10">
              <ActivityIndicator
                size="large"
                color="#fbbf24"
                className="mb-6"
              />
              <Text className="text-white text-lg font-bold text-center">
                IA en cours de réflexion...
              </Text>
              <Text className="text-zinc-400 text-center mt-2 px-10">
                Votre audio est en cours de traitement. Vous recevrez une
                notification quand ce sera prêt.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Petit composant helper pour les stats
function MetricCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: any;
}) {
  return (
    <View className="bg-surface w-[48%] p-4 rounded-xl border border-zinc-800 mb-4">
      <View className="flex-row justify-between items-start mb-2">
        <Ionicons name={icon} size={16} color="#52525b" />
        <Text className="text-zinc-500 text-xs font-bold">{label}</Text>
      </View>
      <Text className="text-2xl font-bold text-white">{value}</Text>
    </View>
  );
}

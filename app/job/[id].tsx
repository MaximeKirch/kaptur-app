import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import Markdown from "react-native-markdown-display";
import { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  ActivityIndicator,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Share,
  Platform,
  KeyboardAvoidingView,
  Alert,
  NativeSyntheticEvent,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
// TEMPORARILY DISABLED FOR TESTING
// import {
//   EnrichedTextInput,
//   type EnrichedTextInputInstance,
// } from "react-native-enriched";
type EnrichedTextInputInstance = any;
import showdown from "showdown";
import { NodeHtmlMarkdown } from "node-html-markdown";
import { generateAndSharePDF } from "../../src/utils/pdfGenerator";
import { ActionSheetIOS } from "react-native";

import { api } from "../../src/services/api";

// 1. Initialisation des convertisseurs
// MD -> HTML (Pour afficher DANS l'éditeur) - Showdown gère ça bien en Regex
const mdToHtmlConverter = new showdown.Converter({
  simpleLineBreaks: true,
  strikethrough: true,
  tables: true,
});

// HTML -> MD (Pour SAUVEGARDER) - NodeHtmlMarkdown n'a pas besoin de DOM
const htmlToMdConverter = new NodeHtmlMarkdown(
  {},
  undefined, // options custom
  undefined, // data custom
);

// Bouton de la toolbar d'édition
const ToolbarButton = ({
  label,
  active,
  onPress,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: active ? "#3b82f6" : "transparent",
    }}
  >
    <Text
      style={{
        color: active ? "#ffffff" : "#a1a1aa",
        fontWeight: "bold",
        fontSize: 14,
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const _editor = useRef<EnrichedTextInputInstance>(null);

  const [activeTab, setActiveTab] = useState<
    "report" | "transcript" | "editor"
  >("report");
  const [editableMarkdown, setEditableMarkdown] = useState("");
  const [initialHtml, setInitialHtml] = useState("");
  const [editorState, setEditorState] = useState<Record<string, any>>({});

  const {
    data: job,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const res = await api.get(`/jobs/${id}`);
      return res.data;
    },
    enabled: !!id,
    // Polling si le job est en cours de traitement
    refetchInterval: (query) => {
      const jobData = query.state.data;
      if (!jobData) return false;

      const isPending =
        jobData.status === "PENDING" || jobData.status === "PROCESSING";

      return isPending ? 3000 : false;
    },
  });

  useEffect(() => {
    if (job) {
      const rawText =
        job.result?.structured_report?.formatted_report ||
        job.result?.raw_transcription ||
        "";
      setEditableMarkdown(rawText);
      // Conversion MD -> HTML pour l'initialisation de l'éditeur
      const html = mdToHtmlConverter.makeHtml(rawText);
      setInitialHtml(html);
    }
  }, [job]);

  const handleShare = async () => {
    const messageToShare =
      activeTab === "editor"
        ? editableMarkdown
        : job?.result?.structured_report?.formatted_report ||
          job?.result?.raw_transcription;
    if (!messageToShare) return;
    try {
      await Share.share({ message: messageToShare, title: "Rapport Relevo" });
    } catch (error) {
      console.error(error);
    }
  };

  const handleExport = async () => {
    let contentHtml = "";
    let contentText = "";

    if (activeTab === "editor" && _editor.current) {
      // Depuis l'éditeur : on récupère le HTML direct
      contentHtml = await _editor.current.getHTML();
      // Pour le texte brut, on convertit
      contentText = htmlToMdConverter.translate(contentHtml);
    } else {
      // Depuis la lecture seule : on a le Markdown, on le convertit en HTML pour le PDF
      const rawMarkdown =
        editableMarkdown || report.structured_report?.formatted_report || "";
      contentText = rawMarkdown;
      contentHtml = mdToHtmlConverter.makeHtml(rawMarkdown);
    }

    if (!contentText) return;

    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Annuler", "Partager le texte brut", "Générer un PDF"],
          cancelButtonIndex: 0,
          userInterfaceStyle: "dark",
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            await Share.share({
              message: contentText,
              title: "Rapport Relevo",
            });
          } else if (buttonIndex === 2) {
            await generateAndSharePDF({
              projectName:
                report.structured_report?.project_name || "Rapport de Chantier",
              date: format(new Date(job.createdAt), "dd MMM yyyy", {
                locale: fr,
              }),
              htmlContent: contentHtml,
            });
          }
        },
      );
    } else {
      Alert.alert("Exporter", "Quel format souhaitez-vous ?", [
        { text: "Annuler", style: "cancel" },
        {
          text: "Texte brut",
          onPress: () => Share.share({ message: contentText }),
        },
        {
          text: "PDF",
          onPress: () =>
            generateAndSharePDF({
              projectName: report.structured_report?.project_name || "Rapport",
              date: format(new Date(job.createdAt), "dd MMM yyyy", {
                locale: fr,
              }),
              htmlContent: contentHtml,
            }),
        },
      ]);
    }
  };

  const handleSaveEditor = async () => {
    if (_editor.current) {
      try {
        // 1. Récupérer le HTML et convertir en MD
        const html = await _editor.current.getHTML();
        const markdown = htmlToMdConverter.translate(html);

        // 2. Mise à jour Optimiste (UI immédiate)
        setEditableMarkdown(markdown);

        // 3. Appel API
        await api.patch(`/jobs/${id}`, {
          updatedReport: markdown,
        });

        // 4. Rafraîchir le cache React Query
        refetch();

        Alert.alert(
          "Succès",
          "Rapport mis à jour et sauvegardé en base de données.",
        );
      } catch (e) {
        console.error("Erreur sauvegarde", e);
        Alert.alert(
          "Erreur",
          "Impossible de sauvegarder les modifications sur le serveur.",
        );
      }
    }
  };

  if (isLoading)
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  if (error || !job)
    return (
      <View className="flex-1 bg-background justify-center items-center">
        <Text className="text-white">Erreur de chargement</Text>
      </View>
    );

  const isCompleted = job.status === "COMPLETED";
  const isFailed = job.status === "FAILED";
  const isPending = job.status === "PENDING" || job.status === "PROCESSING";
  const report = job.result || {};

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return "Terminé";
      case "PENDING":
      case "PROCESSING":
        return "En cours";
      case "FAILED":
        return "Remboursé";
      default:
        return status;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <Stack.Screen options={{ headerShown: false }} />

      {/* HEADER */}
      <View className="px-6 py-4 flex-row justify-between items-center border-b border-zinc-800 bg-background z-10">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        {!isFailed && (
          <View className="flex-row gap-4">
            {activeTab === "editor" && (
              <TouchableOpacity
                onPress={handleSaveEditor}
                className="bg-primary/20 px-3 py-1 rounded-full border border-primary/50"
              >
                <Text className="text-primary font-bold text-xs">
                  Sauvegarder
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleExport}>
              <Ionicons name="share-outline" size={24} color="#3b82f6" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {activeTab === "editor" ? (
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
        >
          <View style={{ flex: 1, backgroundColor: "#09090b" }}>
            {/* TEMPORARILY DISABLED FOR TESTING */}
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
              <Text style={{ color: "#a1a1aa", fontSize: 16, textAlign: "center" }}>
                Éditeur temporairement désactivé pour test
              </Text>
            </View>
            {/* <EnrichedTextInput
              ref={_editor}
              defaultValue={initialHtml}
              placeholder="Commencez à éditer..."
              placeholderTextColor="#52525b"
              cursorColor="#3b82f6"
              selectionColor="rgba(59,130,246,0.4)"
              scrollEnabled
              style={{
                flex: 1,
                color: "#d4d4d8",
                fontSize: 16,
                padding: 16,
              }}
              htmlStyle={{
                h1: { fontSize: 24, bold: true },
                h2: { fontSize: 20, bold: true },
                h3: { fontSize: 18, bold: true },
                blockquote: {
                  borderColor: "#3b82f6",
                  borderWidth: 3,
                  color: "#a1a1aa",
                },
                code: { color: "#f59e0b", backgroundColor: "#27272a" },
                codeblock: {
                  color: "#f59e0b",
                  backgroundColor: "#27272a",
                  borderRadius: 8,
                },
                ul: { bulletColor: "#3b82f6" },
              }}
              onChangeState={(e: NativeSyntheticEvent<any>) =>
                setEditorState(e.nativeEvent)
              }
            /> */}

            {/* TOOLBAR */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="always"
              contentContainerStyle={{
                paddingHorizontal: 8,
                alignItems: "center",
                gap: 2,
              }}
              style={{
                backgroundColor: "#27272a",
                borderTopWidth: 1,
                borderTopColor: "#3f3f46",
                maxHeight: 50,
              }}
            >
              <ToolbarButton
                label="B"
                active={editorState?.bold?.isActive}
                onPress={() => _editor.current?.toggleBold()}
              />
              <ToolbarButton
                label="I"
                active={editorState?.italic?.isActive}
                onPress={() => _editor.current?.toggleItalic()}
              />
              <ToolbarButton
                label="U"
                active={editorState?.underline?.isActive}
                onPress={() => _editor.current?.toggleUnderline()}
              />
              <ToolbarButton
                label="S"
                active={editorState?.strikeThrough?.isActive}
                onPress={() => _editor.current?.toggleStrikeThrough()}
              />
              <View
                style={{
                  width: 1,
                  height: 24,
                  backgroundColor: "#52525b",
                  marginHorizontal: 4,
                }}
              />
              <ToolbarButton
                label="H1"
                active={editorState?.h1?.isActive}
                onPress={() => _editor.current?.toggleH1()}
              />
              <ToolbarButton
                label="H2"
                active={editorState?.h2?.isActive}
                onPress={() => _editor.current?.toggleH2()}
              />
              <ToolbarButton
                label="H3"
                active={editorState?.h3?.isActive}
                onPress={() => _editor.current?.toggleH3()}
              />
              <View
                style={{
                  width: 1,
                  height: 24,
                  backgroundColor: "#52525b",
                  marginHorizontal: 4,
                }}
              />
              <ToolbarButton
                label="• Liste"
                active={editorState?.unorderedList?.isActive}
                onPress={() => _editor.current?.toggleUnorderedList()}
              />
              <ToolbarButton
                label="1. Liste"
                active={editorState?.orderedList?.isActive}
                onPress={() => _editor.current?.toggleOrderedList()}
              />
              <ToolbarButton
                label="Citation"
                active={editorState?.blockQuote?.isActive}
                onPress={() => _editor.current?.toggleBlockQuote()}
              />
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      ) : (
        // MODE LECTURE
        <ScrollView className="flex-1">
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
                  isCompleted
                    ? "bg-green-500/10"
                    : isFailed
                      ? "bg-red-500/10"
                      : "bg-yellow-500/10"
                }`}
              >
                <Text
                  className={`text-xs font-bold uppercase ${
                    isCompleted
                      ? "text-green-500"
                      : isFailed
                        ? "text-red-500"
                        : "text-yellow-500"
                  }`}
                >
                  {getStatusLabel(job.status)}
                </Text>
              </View>
            </View>

            {isPending && (
              <View className="bg-surface p-8 rounded-xl border border-zinc-800 items-center justify-center">
                <ActivityIndicator size="large" color="#fbbf24" />
                <Text className="text-zinc-300 text-lg font-medium mt-4">
                  IA en cours de réflexion...
                </Text>
                <Text className="text-zinc-500 text-sm text-center mt-2">
                  L'analyse de votre enregistrement est en cours. Cela peut
                  prendre quelques instants.
                </Text>
              </View>
            )}

            {isFailed && (
              <View className="bg-red-500/5 p-6 rounded-xl border border-red-500/20">
                <Text className="text-red-400 font-bold text-lg mb-2">
                  Échec de l'analyse
                </Text>
                <Text className="text-red-400/70 text-sm">
                  {job.error || "Une erreur technique est survenue."}
                </Text>
              </View>
            )}

            {isCompleted && (
              <View className="flex-row bg-zinc-900 p-1 rounded-xl mb-6">
                {["report", "transcript", "editor"].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    onPress={() => setActiveTab(tab as any)}
                    className={`flex-1 py-2 rounded-lg items-center ${activeTab === tab ? "bg-zinc-700" : ""}`}
                  >
                    <Text
                      className={`font-medium text-xs ${activeTab === tab ? "text-white" : "text-zinc-500"}`}
                    >
                      {tab === "report"
                        ? "Synthèse"
                        : tab === "transcript"
                          ? "Texte Brut"
                          : "Éditeur"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {isCompleted && activeTab === "report" && (
              <View className="gap-4">
                <View className="bg-surface p-4 rounded-xl border border-zinc-800">
                  <Markdown style={markdownStyles}>
                    {editableMarkdown ||
                      report.structured_report?.formatted_report}
                  </Markdown>
                </View>
              </View>
            )}

            {isCompleted && activeTab === "transcript" && (
              <View className="bg-surface p-4 rounded-xl border border-zinc-800">
                <Text className="text-zinc-300 leading-7 font-mono text-sm">
                  {job.result.raw_transcription}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const markdownStyles = {
  body: { color: "#d4d4d8", fontSize: 16, lineHeight: 24 },
  heading1: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "bold" as const,
    marginBottom: 10,
    marginTop: 20,
  },
  heading2: {
    color: "#ffffff",
    fontSize: 20,
    fontWeight: "bold" as const,
    marginBottom: 10,
    marginTop: 15,
  },
  heading3: {
    color: "#3b82f6",
    fontSize: 18,
    fontWeight: "bold" as const,
    marginBottom: 5,
    marginTop: 10,
  },
  strong: { color: "#ffffff", fontWeight: "bold" as const },
  em: { color: "#a1a1aa", fontStyle: "italic" as const },
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  bullet_list_icon: { color: "#3b82f6", fontSize: 20 },
  bullet_list_content: { fontSize: 16, lineHeight: 24 },
  paragraph: { marginTop: 0, marginBottom: 10 },
};

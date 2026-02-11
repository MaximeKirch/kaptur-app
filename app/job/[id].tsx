import { useLocalSearchParams, useRouter, Stack } from "expo-router";
import { markdownStyles } from "./markdownStyles";
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
  TextInput,
  type TextInput as TextInputType,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
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
  noHeaderId: true, // IMPORTANT : Ne pas générer d'IDs pour les headings
  simplifiedAutoLink: true,
  literalMidWordUnderscores: true,
  ghCodeBlocks: true,
});

// HTML -> MD (Pour SAUVEGARDER) - NodeHtmlMarkdown n'a pas besoin de DOM
const htmlToMdConverter = new NodeHtmlMarkdown(
  {
    // Options pour améliorer la conversion HTML → MD
    bulletMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "*",
    strongDelimiter: "**",
    useLinkReferenceDefinitions: false,
    keepDataImages: false,
  },
  undefined, // options custom
  undefined, // data custom
);

// Fonction utilitaire pour détecter si le contenu est du HTML et le convertir en MD si nécessaire
const normalizeToMarkdown = (content: string): string => {
  if (!content) return "";

  // Détection simple : si on trouve des balises HTML, c'est du HTML
  const hasHtmlTags = /<[^>]+>/g.test(content);

  let markdown = content;

  if (hasHtmlTags) {
    // Convertir HTML → MD
    markdown = htmlToMdConverter.translate(content);
  }

  // Nettoyage et validation du markdown généré
  markdown = markdown
    // CRITIQUE : Retirer TOUS les backslashes d'échappement
    // node-html-markdown échappe tout par sécurité, mais on veut interpréter le markdown
    .replace(/\\([*_#[\]()~`>+\-.!|{}])/g, "$1") // Retire \ devant les caractères markdown
    .replace(/\\\\/g, "\\") // Convertir \\ en \

    // Cas spécial : nettoyer les numéros de liste (1\. → 1.)
    .replace(/(\d+)\\\./g, "$1.")

    // Supprimer les #### en fin de ligne (ex: "#### Titre ####" → "#### Titre")
    .replace(/^(#{1,6}\s+.+?)\s+#{1,6}\s*$/gm, "$1")

    // Supprimer les lignes contenant uniquement #### (headings vides)
    .replace(/^\s*#{1,6}\s*$/gm, "")

    // Supprimer les lignes vides qui ne contiennent que des espaces
    .replace(/^\s*$/gm, "")

    // Assurer qu'il y a un espace après les # pour les headings valides
    .replace(/^(#{1,6})([^\s#])/gm, "$1 $2")

    // Supprimer les lignes vides multiples (max 2 sauts de ligne)
    .replace(/\n{3,}/g, "\n\n")

    // Nettoyer les espaces en fin de ligne
    .replace(/[ \t]+$/gm, "")

    // Trim général
    .trim();

  return markdown;
};

// Composant bouton de toolbar
const ToolbarButton = ({
  label,
  onPress,
  icon,
}: {
  label?: string;
  icon?: string;
  onPress: () => void;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 6,
      backgroundColor: "#27272a",
      minWidth: 36,
      alignItems: "center",
      justifyContent: "center",
    }}
  >
    <Text style={{ color: "#d4d4d8", fontWeight: "600", fontSize: 14 }}>
      {icon || label}
    </Text>
  </TouchableOpacity>
);

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const editorInputRef = useRef<TextInputType>(null);
  const [selection, setSelection] = useState({ start: 0, end: 0 });

  const [activeTab, setActiveTab] = useState<
    "report" | "transcript" | "editor"
  >("report");
  const [editableMarkdown, setEditableMarkdown] = useState("");
  const [editorMarkdown, setEditorMarkdown] = useState("");
  const [editorMode, setEditorMode] = useState<"edit" | "preview">("edit");

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

      // Pipeline unique : TOUJOURS normaliser en Markdown propre d'abord
      // (que ce soit du HTML, du Markdown, ou un mélange des deux)
      const cleanMarkdown = normalizeToMarkdown(rawText);

      // Pour l'affichage en mode lecture : utiliser le Markdown propre
      setEditableMarkdown(cleanMarkdown);

      // Pour l'éditeur : initialiser avec le markdown propre
      setEditorMarkdown(cleanMarkdown);
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
    // Utiliser le markdown édité si on est dans l'éditeur, sinon le markdown affiché
    const contentText =
      activeTab === "editor" ? editorMarkdown : editableMarkdown;

    // Convertir le markdown en HTML pour le PDF
    const contentHtml = mdToHtmlConverter.makeHtml(contentText);

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

  // Fonctions helper pour la toolbar markdown
  const insertMarkdown = (before: string, after: string = "") => {
    const start = selection.start;
    const end = selection.end;
    const selectedText = editorMarkdown.substring(start, end);

    const newText =
      editorMarkdown.substring(0, start) +
      before +
      selectedText +
      after +
      editorMarkdown.substring(end);

    setEditorMarkdown(newText);

    // Remettre le focus et la sélection
    setTimeout(() => {
      editorInputRef.current?.focus();
      const newCursorPos =
        start + before.length + selectedText.length + after.length;
      setSelection({ start: newCursorPos, end: newCursorPos });
    }, 10);
  };

  const insertLinePrefix = (prefix: string) => {
    const start = selection.start;
    // Trouver le début de la ligne
    const lineStart = editorMarkdown.lastIndexOf("\n", start - 1) + 1;

    const newText =
      editorMarkdown.substring(0, lineStart) +
      prefix +
      editorMarkdown.substring(lineStart);

    setEditorMarkdown(newText);

    setTimeout(() => {
      editorInputRef.current?.focus();
      const newCursorPos = start + prefix.length;
      setSelection({ start: newCursorPos, end: newCursorPos });
    }, 10);
  };

  const handleSaveEditor = async () => {
    try {
      // 1. Récupérer le markdown édité
      const markdown = editorMarkdown;

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
            {/* Toggle Edit/Preview */}
            <View
              style={{
                flexDirection: "row",
                backgroundColor: "#18181b",
                padding: 8,
                gap: 8,
                borderBottomWidth: 1,
                borderBottomColor: "#27272a",
              }}
            >
              <TouchableOpacity
                onPress={() => setEditorMode("edit")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor:
                    editorMode === "edit" ? "#3b82f6" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: editorMode === "edit" ? "#ffffff" : "#71717a",
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: 14,
                  }}
                >
                  ✏️ Éditer
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEditorMode("preview")}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: 8,
                  backgroundColor:
                    editorMode === "preview" ? "#3b82f6" : "transparent",
                }}
              >
                <Text
                  style={{
                    color: editorMode === "preview" ? "#ffffff" : "#71717a",
                    fontWeight: "bold",
                    textAlign: "center",
                    fontSize: 14,
                  }}
                >
                  👁 Prévisualiser
                </Text>
              </TouchableOpacity>
            </View>

            {/* Contenu selon le mode */}
            {editorMode === "edit" ? (
              // Mode Édition : TextInput + Toolbar
              <>
                <ScrollView style={{ flex: 1 }}>
                  <TextInput
                    ref={editorInputRef}
                    value={editorMarkdown}
                    onChangeText={setEditorMarkdown}
                    onSelectionChange={(e) =>
                      setSelection(e.nativeEvent.selection)
                    }
                    placeholder="Éditez votre rapport en markdown..."
                    placeholderTextColor="#52525b"
                    multiline
                    style={{
                      flex: 1,
                      minHeight: 500,
                      color: "#d4d4d8",
                      fontSize: 15,
                      padding: 16,
                      fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
                      lineHeight: 22,
                    }}
                  />
                </ScrollView>

                {/* TOOLBAR MARKDOWN */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="always"
                  contentContainerStyle={{
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    gap: 8,
                  }}
                  style={{
                    backgroundColor: "#18181b",
                    borderTopWidth: 1,
                    borderTopColor: "#27272a",
                    maxHeight: 56,
                  }}
                >
                  <ToolbarButton
                    label="B"
                    onPress={() => insertMarkdown("**", "**")}
                  />
                  <ToolbarButton
                    label="I"
                    onPress={() => insertMarkdown("*", "*")}
                  />
                  <ToolbarButton
                    label="~~"
                    onPress={() => insertMarkdown("~~", "~~")}
                  />
                  <View
                    style={{
                      width: 1,
                      height: 32,
                      backgroundColor: "#3f3f46",
                    }}
                  />
                  <ToolbarButton
                    label="H1"
                    onPress={() => insertLinePrefix("# ")}
                  />
                  <ToolbarButton
                    label="H2"
                    onPress={() => insertLinePrefix("## ")}
                  />
                  <ToolbarButton
                    label="H3"
                    onPress={() => insertLinePrefix("### ")}
                  />
                  <ToolbarButton
                    label="H4"
                    onPress={() => insertLinePrefix("#### ")}
                  />
                  <View
                    style={{
                      width: 1,
                      height: 32,
                      backgroundColor: "#3f3f46",
                    }}
                  />
                  <ToolbarButton
                    icon="•"
                    onPress={() => insertLinePrefix("- ")}
                  />
                  <ToolbarButton
                    label="1."
                    onPress={() => insertLinePrefix("1. ")}
                  />
                  <ToolbarButton
                    icon=">"
                    onPress={() => insertLinePrefix("> ")}
                  />
                  <View
                    style={{
                      width: 1,
                      height: 32,
                      backgroundColor: "#3f3f46",
                    }}
                  />
                  <ToolbarButton
                    icon="`"
                    onPress={() => insertMarkdown("`", "`")}
                  />
                  <ToolbarButton
                    label="```"
                    onPress={() => insertMarkdown("\n```\n", "\n```\n")}
                  />
                  <ToolbarButton
                    label="[]()"
                    onPress={() => insertMarkdown("[", "](url)")}
                  />
                </ScrollView>
              </>
            ) : (
              // Mode Preview : Afficher le rendu avec Markdown
              <ScrollView style={{ flex: 1 }}>
                <View style={{ padding: 16 }}>
                  <Markdown style={markdownStyles}>{editorMarkdown}</Markdown>
                </View>
              </ScrollView>
            )}
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

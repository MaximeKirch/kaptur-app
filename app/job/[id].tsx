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
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import QuillEditor, { QuillToolbar } from "react-native-cn-quill";
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

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const _editor = useRef<QuillEditor>(null);

  const [activeTab, setActiveTab] = useState<
    "report" | "transcript" | "editor"
  >("report");
  const [editableMarkdown, setEditableMarkdown] = useState("");
  const [initialHtml, setInitialHtml] = useState("");

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
  });

  useEffect(() => {
    if (job) {
      const rawText =
        job.result?.structured_report?.formatted_report ||
        job.result?.raw_transcription ||
        "";
      setEditableMarkdown(rawText);
      // Conversion MD -> HTML pour l'initialisation de Quill
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
    // 1. Déterminer quel contenu utiliser
    // Si on est dans l'éditeur, on prend le contenu HTML direct (WYSIWYG)
    // Sinon, on prend le Markdown stocké et on le convertit

    let contentHtml = "";
    let contentText = ""; // Pour le partage simple (WhatsApp etc)

    if (activeTab === "editor" && _editor.current) {
      // Depuis l'éditeur : on récupère le HTML direct
      contentHtml = await _editor.current.getHtml();
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

    // 2. Menu de choix (UX Native)
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Annuler", "Partager le texte brut", "Générer un PDF"],
          cancelButtonIndex: 0,
          userInterfaceStyle: "dark",
        },
        async (buttonIndex) => {
          if (buttonIndex === 1) {
            // Partage Texte simple
            await Share.share({
              message: contentText,
              title: "Rapport Relevo",
            });
          } else if (buttonIndex === 2) {
            // Génération PDF
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
      // Fallback Android (Alert simple)
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
        const html = await _editor.current.getHtml();
        const markdown = htmlToMdConverter.translate(html);

        // 2. Mise à jour Optimiste (UI immédiate)
        setEditableMarkdown(markdown);

        // 3. Appel API
        // On affiche un petit loading ou on bloque le bouton idéalement,
        // mais pour l'instant une alerte suffit.
        await api.patch(`/jobs/${id}`, {
          updatedReport: markdown,
        });

        // 4. On rafraichit les données du cache React Query pour être sûr
        // que tout est synchro (notamment si on re-génère le PDF derrière)
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
  const report = job.result || {};

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
          <View className="flex-1 bg-white">
            <QuillEditor
              ref={_editor}
              initialHtml={initialHtml}
              style={{ flex: 1, padding: 10 }}
              quill={{
                placeholder: "Commencez à éditer...",
                modules: { toolbar: false },
                theme: "snow",
              }}
              customStyles={[editorCustomStyles]}
              webview={{
                style: { backgroundColor: "#09090b" },
                scrollEnabled: true,
              }}
              onSelectionChange={() => {}}
            />

            {/* LA TOOLBAR NATIVE */}
            {/* Elle est maintenant DANS le KeyboardAvoidingView, donc elle remontera */}
            <QuillToolbar
              editor={_editor}
              options="full"
              theme="dark"
              styles={{
                toolbar: {
                  provider: (provided) => ({
                    ...provided,
                    backgroundColor: "#27272a",
                    borderTopWidth: 0,
                  }),
                  root: (provided) => ({
                    ...provided,
                    backgroundColor: "#27272a",
                    height: 50,
                  }),
                },
              }}
            />
          </View>
        </KeyboardAvoidingView>
      ) : (
        // MODE LECTURE (Rien ne change ici)
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
                className={`px-3 py-1.5 rounded-full ${isCompleted ? "bg-green-500/10" : "bg-yellow-500/10"}`}
              >
                <Text
                  className={`text-xs font-bold ${isCompleted ? "text-green-500" : "text-yellow-500"}`}
                >
                  {job.status}
                </Text>
              </View>
            </View>

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

            {activeTab === "report" && (
              <View className="gap-4">
                <View className="bg-surface p-4 rounded-xl border border-zinc-800">
                  <Markdown style={markdownStyles}>
                    {editableMarkdown ||
                      report.structured_report?.formatted_report}
                  </Markdown>
                </View>
              </View>
            )}

            {activeTab === "transcript" && (
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

// Styles CSS injectés dans la WebView de l'éditeur
const editorCustomStyles = `
  /* 1. CONFIGURATION GLOBALE */
  body {
    background-color: #09090b !important; /* Zinc-950 (Background App) */
    color: #d4d4d8 !important; /* Zinc-300 (Idem Markdown Body) */
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    margin: 0;
    padding: 0;
  }

  /* 2. TITRES (Pour matcher heading1, heading2...) */
  h1 {
    font-size: 32px;
    line-height: 40px;
    color: #3b82f6;
  }
   h2, h3, h4, h5, h6 {
    color: #ffffff !important; /* Blanc pur */
    font-weight: bold;
    margin-top: 20px;
    margin-bottom: 10px;
  }

  p,span {
    color: #ffffff !important; /* Blanc pur */
    font-weight: normal;
    margin-top: 20px;
    margin-bottom: 10px;
  }

  /* 3. GRAS (Pour matcher strong) */
  strong, b {
    color: #ffffff !important; /* Blanc pur */
    font-weight: bold;
  }

  /* 4. LE CONTENEUR QUILL */
  .ql-container.ql-snow {
    border: none !important;
  }

  /* 5. LA ZONE D'ÉDITION */
  .ql-editor {
    font-size: 16px;       /* Idem Markdown fontSize */
    line-height: 24px;     /* Idem Markdown lineHeight */
    padding: 16px;         /* Padding confortable */
    caret-color: #3b82f6;  /* Curseur Primary */
  }

  /* 6. LISTES */
  li {
    color: #d4d4d8 !important;
  }

  /* 7. PLACEHOLDER */
  .ql-editor.ql-blank::before {
    color: #52525b !important; /* Zinc-600 */
    font-style: italic !important;
    left: 16px !important;
  }
`;
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

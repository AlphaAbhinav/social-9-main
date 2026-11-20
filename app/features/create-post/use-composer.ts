"use client";

import { type ChangeEvent, useCallback, useEffect, useState } from "react";
import { isComingSoonProvider } from "../../lib/provider-availability";
import { ApiError, apiRequest, getActiveBrandId, type Social9Brand } from "../../lib/api";
import { getContentTemplate, templateDraft } from "../../lib/content-templates";
import { personalizeTemplate, templateChannels, templateSupportedChannels, type BrandTemplateProfile, type TemplateChannel } from "../../lib/brand-templates";
import { clearSession, getAccessToken } from "../../lib/session";
import { type MediaPayload, fileData, photoForAssistant, makeCollage, instagramReadyFile, postThumbnail } from "./media";
import { track } from "../../lib/track";

type FacebookPage = { id: number; provider: string; account_name: string; status: string; environment?: string };

type Provider = "instagram" | "linkedin" | "facebook" | "threads" | "youtube" | "twitter" | "pinterest";
export type SavedPost = {
  preview_media?: string[];
  account_names?: Record<string,string>;
  network_options?: Record<string,string|number|boolean>;
  id: number;
  caption: string;
  platforms: Provider[];
  status: "draft" | "scheduled" | "publishing" | "published" | "failed";
  scheduled_for: string | null;
  media_urls: string[];
  post_type: "post" | "story" | "reel" | "video";
  external_post_ids: Record<string, string>;
  facebook_account_id: number | null;
  publish_error: string | null;
  published_at: string | null;
  created_at: string;
};
export type AIAssistAction = "caption" | "improve" | "hashtags" | "shorten";
type AIAssistResponse = { generation_id?: number | null; content: string; suggestions: string[]; simulated: boolean; context?: { brand: {name:string}; evidence:{provider:string;top_posts:unknown[];reason?:string}[] } };
type Subscription = {
  is_paid: boolean;
  features: { ai_assistant: boolean };
};

export function useComposer() {
  const [postType, setPostTypeState] = useState<"post" | "story" | "reel" | "video">("post");
  const [caption, setCaption] = useState("");
  const [templateVisual, setTemplateVisual] = useState("");
  const [platforms, setPlatforms] = useState<Provider[]>([]);
  const [networkAccounts, setNetworkAccounts] = useState<FacebookPage[]>([]);
  const [networkOptions, setNetworkOptions] = useState<Record<string, string | number | boolean>>({ youtube_privacy: "private" });
  const setPostType = useCallback((value: "post" | "story" | "reel" | "video") => {
    setPostTypeState(value);
    setNetworkOptions(current => Object.fromEntries(Object.entries(current).filter(([key]) =>
      value === "post" || value === "story"
        ? !["instagram_audio_id", "instagram_audio_title", "instagram_audio_artist", "instagram_audio_volume", "instagram_video_volume"].includes(key)
        : key !== "instagram_manual_music")));
  }, []);
  const [pinterestBoardState, setPinterestBoardState] = useState<{accountId:number;boards:Array<{id:string;name:string;privacy?:string}>} | null>(null);
  const pinterestBoards = pinterestBoardState && pinterestBoardState.accountId === networkOptions.pinterest_account_id ? pinterestBoardState.boards : [];
  const [preparingPinterestBoard, setPreparingPinterestBoard] = useState(false);
  const [facebookPages, setFacebookPages] = useState<FacebookPage[]>([]);
  const [facebookAccountId, setFacebookAccountId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const imageFiles = files.filter((file) => !/\.(mp4|mov)$/i.test(file.name));
  const [collageOriginals, setCollageOriginals] = useState<File[] | null>(null);
  const [collagePreview, setCollagePreview] = useState("");
  const [collageBusy, setCollageBusy] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");
  const [posts, setPosts] = useState<SavedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<"draft" | "scheduled" | "publish" | null>(null);
  const [publishingId, setPublishingId] = useState<number | null>(null);
  const [pendingDelete, setPendingDelete] = useState<SavedPost | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [aiAction, setAiAction] = useState<AIAssistAction>("caption");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiResult, setAiResult] = useState<AIAssistResponse | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => () => { if (collagePreview) URL.revokeObjectURL(collagePreview); }, [collagePreview]);

  const unauthorized = useCallback(() => {
    clearSession();
    window.location.replace("/login");
  }, []);

  const loadPosts = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return unauthorized();
    try {
      setPosts(await apiRequest<SavedPost[]>("/posts?limit=6", { headers: { Authorization: `Bearer ${token}` } }));
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setError(requestError instanceof Error ? requestError.message : "Unable to load saved posts.");
    } finally {
      setLoading(false);
    }
  }, [unauthorized]);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return unauthorized();
    Promise.all([
      apiRequest<SavedPost[]>("/posts?limit=6", { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<Subscription>("/billing/subscription", { headers: { Authorization: `Bearer ${token}` } }),
      apiRequest<FacebookPage[]>("/social-accounts", { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([loadedPosts, loadedSubscription, loadedAccounts]) => {
        const pages = loadedAccounts.filter(account => account.provider === "facebook" && account.status === "connected");
        setNetworkAccounts(loadedAccounts.filter(account => account.status === "connected"));
        setNetworkOptions(current => {
          const next = { ...current };
          for (const provider of ["instagram", "linkedin", "threads", "youtube", "twitter", "pinterest"]) {
            const accounts = loadedAccounts.filter(account => account.provider === provider && account.status === "connected");
            if (accounts.length === 1 && !next[`${provider}_account_id`]) next[`${provider}_account_id`] = accounts[0].id;
          }
          return next;
        });
        setFacebookPages(pages);
        setFacebookAccountId(pages.length === 1 ? String(pages[0].id) : "");
        setPosts(loadedPosts);
        setSubscription(loadedSubscription);
      })
      .catch((requestError: unknown) => {
        if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
        setError(requestError instanceof Error ? requestError.message : "Unable to load saved posts.");
      })
      .finally(() => setLoading(false));
  }, [unauthorized]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const parameters = new URLSearchParams(window.location.search);
      if (parameters.get("music")) {
        setPostType("reel");
        if (parameters.get("music") === "connected") setMessage("Instagram music connected. Return to your original composer tab to continue, or create a Reel here.");
        else setError("Instagram music was not connected. Approve the Facebook Page linked to your Instagram account and try again.");
      }
      const idea = parameters.get("idea");
      const selectedTemplate = getContentTemplate(parameters.get("template"));
      const platform = parameters.get("platform");
      const planDate = parameters.get("date");
      const planTime = parameters.get("time");
      if (selectedTemplate) {
        const headers = { Authorization: `Bearer ${getAccessToken()}` };
        void apiRequest<Social9Brand[]>("/brands", { headers, signal: controller.signal }).then(async brands => {
          const brand = brands.find(item => item.id === getActiveBrandId()) ?? brands[0];
          if (!brand) throw new Error("Choose a brand before using a template.");
          if (parameters.get("template_brand") && parameters.get("template_brand") !== String(brand.id)) throw new Error("This template was selected for a different brand. Return to Templates to choose an idea for your current brand.");
          const options = { headers: { ...headers, "X-Brand-ID": String(brand.id) }, signal: controller.signal };
          const [profile, accounts] = await Promise.all([
            apiRequest<BrandTemplateProfile>("/ai/brand-profile", options),
            apiRequest<FacebookPage[]>("/social-accounts", options),
          ]);
          if (controller.signal.aborted) return;
          const channels = templateSupportedChannels.filter(channel => accounts.some(account => account.provider === channel && account.status === "connected")) as TemplateChannel[];
          const compatible = templateChannels(selectedTemplate, channels);
          const chosen = compatible.includes(platform as TemplateChannel) ? platform as TemplateChannel : compatible[0];
          if (!chosen) throw new Error("Connect a suitable channel for this brand before using this template.");
          const personalized = personalizeTemplate(selectedTemplate, { ...brand, profile, channels });
          const draft = templateDraft(personalized);
          setTemplateVisual(personalized.visual);
          setCaption(current => current || draft);
          setPlatforms([chosen]);
          setPostType(selectedTemplate.format === "Video" ? "video" : selectedTemplate.format === "Story" ? "story" : "post");
          const matchingAccounts = accounts.filter(account => account.provider === chosen && account.status === "connected");
          if (chosen === "facebook" && matchingAccounts.length === 1) setFacebookAccountId(String(matchingAccounts[0].id));
          if (["linkedin", "threads", "youtube", "twitter", "pinterest"].includes(chosen)) setNetworkOptions(current => ({ ...current,
            ...(matchingAccounts.length === 1 ? { [`${chosen}_account_id`]: matchingAccounts[0].id } : {}),
            ...(chosen === "youtube" ? { youtube_title: selectedTemplate.title } : {}),
            ...(chosen === "pinterest" ? { pinterest_title: selectedTemplate.title } : {}),
          }));
          track("template_used", { label: selectedTemplate.title, provider: chosen });
          setMessage(`${selectedTemplate.title} is ready for ${brand.name}. Replace the remaining bracketed details and add your media before publishing.`);
        }).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to personalize this template."); });
      } else if (idea) {
        setCaption(idea);

      }
      if (!selectedTemplate && (platform === "instagram" || platform === "linkedin" || platform === "facebook" || platform === "threads" || platform === "youtube" || platform === "twitter")) {
        setPlatforms([platform]);
        if (platform === "youtube") setPostType("video");
      }
      if (planDate && planTime) {
        const suggestedSchedule = `${planDate}T${planTime}`;
        if (new Date(suggestedSchedule).getTime() > Date.now()) {
          setScheduledFor(suggestedSchedule);
        }
      }
    }, 0);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [setPostType]);

  useEffect(() => {
    const accountId = networkOptions.pinterest_account_id;
    if (!accountId || !platforms.includes("pinterest")) return;
    let active = true;
    const token = getAccessToken();
    void apiRequest<Array<{id:string;name:string;privacy?:string}>>(`/social-accounts/pinterest/${accountId}/boards`, {headers:{Authorization:`Bearer ${token}`}}).then(boards => {if(active) setPinterestBoardState({accountId:Number(accountId),boards});}).catch(cause => {if(active) setError(cause instanceof Error ? cause.message : "Could not load Pinterest boards.");});
    return () => {active = false;};
  }, [networkOptions.pinterest_account_id, platforms]);

  async function preparePinterestTrialBoard() {
    const accountId = Number(networkOptions.pinterest_account_id);
    if (!networkAccounts.some(account => account.id === accountId && account.provider === "pinterest" && account.environment === "sandbox")) return;
    const token = getAccessToken();
    if (!token) return unauthorized();
    setPreparingPinterestBoard(true);
    setError("");
    try {
      const board = await apiRequest<{id:string;name:string;privacy?:string}>(`/social-accounts/pinterest/${accountId}/trial-board`, {method:"POST",headers:{Authorization:`Bearer ${token}`}});
      setPinterestBoardState(current => ({accountId,boards:[...(current?.accountId === accountId ? current.boards.filter(item => item.id !== board.id) : []),board]}));
      setNetworkOptions(current => current.pinterest_account_id === accountId ? {...current,pinterest_board_id:board.id} : current);
      setMessage("Pinterest Sandbox demo board is selected. Add one JPG or PNG image to publish a trial Pin.");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not prepare the Pinterest Sandbox board.");
    } finally {
      setPreparingPinterestBoard(false);
    }
  }

  function togglePlatform(provider: Provider) {
    if (isComingSoonProvider(provider)) return;
    if (postType === "story" && provider !== "instagram") return;
    if (postType === "reel" && !["instagram", "facebook"].includes(provider)) return;
    if (provider === "youtube" && postType !== "video") return;
    if (provider === "threads" && files.length > 1) return;
    if (provider === "twitter" && (postType !== "post" || files.length > 0)) return;
    if (provider === "pinterest" && (postType !== "post" || files.length > 1 || files.some(file => !/\.(jpe?g|png)$/i.test(file.name)))) return;
    setPlatforms((current) => current.includes(provider) ? current.filter((item) => item !== provider) : [...current, provider]);
  }

  async function runAIAssist() {
    const photoAction = aiAction === "caption" || aiAction === "hashtags";
    const topic = photoAction && imageFiles.length ? "" : caption.trim();
    if (topic.length < 2 && (!photoAction || !imageFiles.length)) {
      setAiError("Upload a photo to generate a caption, or add a draft to improve or shorten.");
      return;
    }
    const token = getAccessToken();
    if (!token) return unauthorized();
    setAiLoading(true);
    setAiError("");
    setAiResult(null);
    setMessage("");
    try {
      const images = photoAction ? await Promise.all(imageFiles.map(photoForAssistant)) : [];
      const result = await apiRequest<AIAssistResponse>("/ai/assist", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: aiAction, topic, images, platform: platforms[0] ?? "all", ...(platforms.length ? { platforms } : {}) }),
      });
      setAiResult(result);
      track("ai_assist_used", { label: aiAction, platforms: platforms.join(",") || "all" });
    } catch (requestError) {
      if (requestError instanceof ApiError && requestError.status === 401) return unauthorized();
      setAiError(requestError instanceof Error ? requestError.message : "Unable to use the content assistant.");
    } finally {
      setAiLoading(false);
    }
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.target.files ?? []);
    const video = (file: File) => /\.(mp4|mov)$/i.test(file.name);
    const uploadFormat = postType === "post" && selected.length === 1 && selected.every(video) ? "video" : postType;
    const wrongFormat = uploadFormat === "post" ? selected.some(video)
      : uploadFormat === "story" ? selected.length > 1
      : selected.length !== 1 || !selected.every(video);
    if (wrongFormat || selected.length > 10 || selected.some((file) => !file.size || file.size > 25 * 1024 * 1024 || !/\.(jpe?g|png|mp4|mov)$/i.test(file.name)) || selected.reduce((total, file) => total + file.size, 0) > 25 * 1024 * 1024) {
      setError("Use up to 10 images for a post, one image/video for a Story, or one video for a Reel/video post. Images: 25 MB each. Video and total: 25 MB.");
      event.target.value = "";
      return;
    }
    setAiResult(null);
    if (uploadFormat !== postType) {
      setPostType("video");
      setPlatforms(current=>current.filter(provider=>provider!=="twitter" && provider!=="pinterest"));
    }
    setFiles(selected);
    if (selected.length) setPlatforms(current => current.filter(provider => provider !== "twitter" && (provider !== "threads" || selected.length <= 1) && (provider !== "pinterest" || (selected.length === 1 && !video(selected[0])))));
    setCollageOriginals(null);
    setCollagePreview("");
    setError("");
  }

  async function createCollage() {
    if (files.length < 2 || files.length > 9) return setError("Choose 2 to 9 images for a collage.");
    setCollageBusy(true);
    setError("");
    try {
      const collage = await makeCollage(files);
      setCollageOriginals(files);
      setFiles([collage]);
      setCollagePreview(URL.createObjectURL(collage));
      track("collage_created");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not make the collage.");
    } finally {
      setCollageBusy(false);
    }
  }

  async function savePost(mode: "draft" | "scheduled" | "publish") {
    if (platforms.includes("instagram") && networkOptions.instagram_manual_music && mode !== "draft") return setError("Add music and finish publishing inside Instagram. Download a calendar reminder instead.");
    if (platforms.some(isComingSoonProvider)) return setError("This network is coming soon. Choose an available network.");
    for (const provider of ["linkedin", "threads", "youtube", "twitter", "pinterest"]) {
      if (platforms.includes(provider as Provider) && !networkOptions[`${provider}_account_id`]) return setError(`Choose a connected ${provider === "twitter" ? "X" : provider} account.`);
    }
    if (platforms.includes("threads") && (caption.length > 500 || files.length > 1)) return setError("Threads supports up to 500 characters and one image or video.");
    if (platforms.includes("twitter") && (caption.length > 280 || files.length || postType !== "post")) return setError("X currently supports text posts of up to 280 characters. X also applies its weighted character limit.");
    if (platforms.includes("youtube") && (postType !== "video" || !networkOptions.youtube_title || typeof networkOptions.youtube_made_for_kids !== "boolean")) return setError("YouTube requires a video, title and audience declaration.");
    if (platforms.includes("pinterest") && (postType !== "post" || files.length !== 1 || !/\.(jpe?g|png)$/i.test(files[0].name) || !networkOptions.pinterest_board_id || caption.length > 800)) return setError("Pinterest requires one JPG or PNG image, a board and a description of up to 800 characters.");
    if (platforms.includes("facebook") && postType === "story") return setError("Facebook Stories are not supported.");
    if (platforms.includes("facebook") && !facebookAccountId) return setError("Choose a Facebook Page before saving.");
    if (!caption.trim()) return setError("Add a caption before saving.");
    if (postType !== "post" && files.length !== 1) return setError("Add one media file for this format.");
    if (platforms.includes("instagram") && caption.length > 2200 && postType !== "story") return setError("Instagram captions must be at most 2,200 characters.");
    if (platforms.length === 0) return setError("Select at least one platform.");
    if (mode === "scheduled" && !scheduledFor) return setError("Choose a future date and time.");
    if (mode === "scheduled" && (!Number.isFinite(new Date(scheduledFor).getTime()) || new Date(scheduledFor).getTime() <= Date.now())) return setError("Choose a future date and time.");

    const token = getAccessToken();
    if (!token) return unauthorized();
    setSaving(mode);
    setAiError("");
    setError("");
    setMessage("");
    try {
      if (mode !== "draft" && platforms.includes("instagram") && networkOptions.instagram_audio_id && files[0]) {
        const { Input, BlobSource, ALL_FORMATS } = await import("mediabunny");
        const input = new Input({source: new BlobSource(files[0]), formats: ALL_FORMATS});
        try {
          if (!await input.getPrimaryAudioTrack()) throw new Error("Instagram music mixing requires a video with an audio track. Add original or silent audio to your video, then upload it again.");
        } finally { input.dispose(); }
      }
      const preparedFiles = platforms.includes("instagram")
        ? await Promise.all(files.map(instagramReadyFile))
        : files;
      if (preparedFiles.some((file) => file.size > 25 * 1024 * 1024) || preparedFiles.reduce((total, file) => total + file.size, 0) > 25 * 1024 * 1024) {
        throw new Error("Prepared media exceeds the size limit. Images: 25 MB each; videos and total: 25 MB.");
      }
      const media: MediaPayload[] = await Promise.all(preparedFiles.map(async (file) => ({ name: file.name, data: await fileData(file) })));
      const created = await apiRequest<SavedPost>("/posts", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          caption: caption.trim(),
          post_type: postType,
          platforms,
          network_options: Object.fromEntries(Object.entries(networkOptions).filter(([key,value]) => value !== "" && platforms.some(provider => key.startsWith(`${provider}_`)))),
          facebook_account_id: platforms.includes("facebook") ? Number(facebookAccountId) : null,
          scheduled_for: mode === "scheduled" ? new Date(scheduledFor).toISOString() : null,
          media,
          preview_media: await Promise.all(files.map(postThumbnail)).catch(()=>[]),
        }),
      });
      let result = created;
      if (mode === "publish") {
        result = await apiRequest<SavedPost>(`/posts/${created.id}/publish`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (result.status === "failed") {
          track("post_publish_failed", { platforms: platforms.join(","), post_type: postType });
          setError(result.publish_error ?? "The provider could not publish this post.");
          await loadPosts();
          return;
        }
      }
      track(mode === "draft" ? "post_draft_saved" : mode === "scheduled" ? "post_scheduled" : "post_published", { platforms: platforms.join(","), post_type: postType, method: templateVisual ? "template" : "manual" });
      setCaption("");
      setFiles([]);
      setCollageOriginals(null);
      setCollagePreview("");
      setScheduledFor("");
      setNetworkOptions(current => Object.fromEntries(Object.entries(current).filter(([key]) => !["instagram_audio_id", "instagram_audio_title", "instagram_audio_artist", "instagram_audio_volume", "instagram_video_volume", "instagram_manual_music"].includes(key))));
      const previewDelivery = Object.values(result.external_post_ids).some((value) => value.startsWith("preview:"));
      setMessage(mode === "scheduled" ? "Post scheduled for automatic publishing." : mode === "publish" ? ((result.status === "publishing" || result.status === "scheduled") ? "Publishing is in progress. Check the content library for delivery status." : previewDelivery ? "Preview publishing flow completed. Connect live provider access for public delivery." : `Published to ${platforms.map((provider) => provider === "twitter" ? "X" : provider === "youtube" ? "YouTube" : provider === "pinterest" ? "Pinterest" : provider === "linkedin" ? "LinkedIn" : provider === "facebook" ? "Facebook" : provider === "threads" ? "Threads" : "Instagram").join(" and ")}.`) : "Draft saved.");
      await loadPosts();
      return true;
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to save your post.");
    } finally {
      setSaving(null);
    }
  }

  async function publishExisting(postId: number) {
    const token = getAccessToken();
    if (!token) return unauthorized();
    setPublishingId(postId);
    setError("");
    setMessage("");
    try {
      const result = await apiRequest<SavedPost>(`/posts/${postId}/publish`, { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      if (result.status === "failed") setError(result.publish_error ?? "The provider could not publish this post.");
      else setMessage((result.status === "publishing" || result.status === "scheduled") ? "Publishing is in progress. Check the content library for delivery status." : Object.values(result.external_post_ids).some((value) => value.startsWith("preview:")) ? "Preview publishing flow completed. Connect live provider access for public delivery." : "Post published successfully.");
      await loadPosts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to publish the post.");
    } finally {
      setPublishingId(null);
    }
  }

  async function deletePost() {
    if (!pendingDelete) return;
    const token = getAccessToken();
    if (!token) return unauthorized();
    setDeleting(true);
    setError("");
    try {
      await apiRequest(`/posts/${pendingDelete.id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      setMessage("Post deleted.");
      setPendingDelete(null);
      await loadPosts();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to delete the post.");
    } finally {
      setDeleting(false);
    }
  }

  return {
    templateVisual,
    networkAccounts, networkOptions, setNetworkOptions, pinterestBoards, preparingPinterestBoard, preparePinterestTrialBoard,
    facebookPages,
    facebookAccountId,
    setFacebookAccountId,
    postType,
    setPostType,
    caption,
    setCaption,
    platforms,
    setPlatforms,
    files,
    setFiles,
    imageFiles,
    collageOriginals,
    setCollageOriginals,
    collagePreview,
    setCollagePreview,
    collageBusy,
    scheduledFor,
    setScheduledFor,
    posts,
    loading,
    saving,
    publishingId,
    pendingDelete,
    setPendingDelete,
    deleting,
    message,
    error,
    aiAction,
    setAiAction,
    aiLoading,
    aiError,
    aiResult,
    setAiResult,
    subscription,
    togglePlatform,
    runAIAssist,
    selectFiles,
    createCollage,
    savePost,
    publishExisting,
    deletePost
  };
}

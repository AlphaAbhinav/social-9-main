"use client";
import { AIFeedback } from "../components/ai-feedback";
import {useState} from "react";

import { comingSoonProviders, platformName } from "../lib/provider-availability";
import { Dropdown } from "../components/dropdown";
import Image from "next/image";
import { ConfirmationDialog } from "../components/confirmation-dialog";
import { DashboardPageFrame } from "../components/dashboard-page-frame";
import Link from "../components/link";
import { SocialIcon } from "../components/social-icon";
import { useComposer } from "../features/create-post/use-composer";
import type { AIAssistAction } from "../features/create-post/use-composer";
import { LocalImagePreview } from "../features/create-post/local-image-preview";
import { PostPreview } from "../features/create-post/post-preview";
import { RecentPostCard } from "../features/create-post/recent-post-card";
import { MediaEditor } from "../features/create-post/media-editor";
import { ScheduleDialog } from "../features/create-post/schedule-dialog";
import { InstagramMusic } from "../features/create-post/instagram-music";
import "../features/create-post/composer-layout.css";

export default function CreatePostPage() {
  const [scheduleOpen,setScheduleOpen]=useState(false);
  const [editingFile,setEditingFile]=useState<File|null>(null);
  const [editError,setEditError]=useState("");
  const {
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
  } = useComposer();

  return (
    <DashboardPageFrame active="create-post" className="composer-content">
        <header className="dashboard-header">
          <div><span className="eyebrow">Content studio</span><h1>Create your next post.</h1><p>Write once, choose your channels, then publish now or schedule it for later.</p><Link className="composer-template-link" href="/templates">Browse ready-to-edit templates →</Link></div>
          <span className="local-mode-badge" role="status">{loading ? "Checking channels..." : !networkAccounts.length ? "Connect a channel to publish" : !platforms.length || platforms.some(provider => !networkAccounts.some(account => account.provider === provider)) ? "Choose a connected channel" : !caption.trim() || (platforms.includes("instagram") && !files.length) || (postType !== "post" && files.length !== 1) || (platforms.includes("facebook") && !facebookAccountId) ? "Complete your post to publish" : "Draft ready - permissions checked on publish"}</span>
        </header>

        {message ? <p className="success-message" role="status">{message}</p> : null}
        {error ? <p className="error-message composer-error" role="alert">{error}</p> : null}

        <div className="composer-layout">
          <section className="composer-card" aria-label="Post composer">
            <div className="composer-format">
            <label className="composer-label" htmlFor="post-format">Post format</label>
            <Dropdown id="post-format" label="Post format" value={postType} onValueChange={(value) => {
              setPostType(value as typeof postType); setFiles([]); setCollageOriginals(null); setCollagePreview(""); setAiResult(null);
              if (value === "story") setPlatforms(["instagram"]);
              if (value === "post") setPlatforms(current => current.filter(provider => provider !== "youtube"));
              if (value === "video") setPlatforms(current => current.filter(provider => provider !== "twitter" && provider !== "pinterest"));
              if (value === "reel") {
                const channels = platforms.filter((p) => p === "instagram" || p === "facebook");
                setPlatforms(channels.length ? channels : ["instagram"]);
              }
            }}><option value="post">Feed post / image carousel</option><option value="story">Instagram Story</option><option value="reel">Reel · Instagram + Facebook</option><option value="video">Video</option></Dropdown>
            </div>
            <p className="ai-assist-hint">{postType === "story" ? "Stories require an Instagram Business account. Upload one finished image or video. The text below is an internal label, not a Story overlay. Add text, music, and stickers to the file before uploading." : postType === "reel" || postType === "video" ? "Upload one MP4 or MOV video. Social9 currently supports up to 25 MB per upload. Use H.264 video with AAC audio for broad compatibility; portrait 9:16 is recommended for Reels. Instagram videos publish as Reels. Processing continues automatically before delivery." : "Images publish to the feed; multiple images become a carousel."}</p>
            <label className="composer-label" htmlFor="post-caption">{postType === "story" ? "Internal Story label" : "Caption"} <span>{caption.length}/3000</span></label>
            <textarea id="post-caption" maxLength={3000} value={caption} onChange={(event) => setCaption(event.target.value)} placeholder="Share an update, offer, announcement or story..." />

            <details className="ai-assist-panel composer-assist-disclosure">
              <summary>AI writing assistant <span>Caption, hashtags & refinement <b aria-hidden="true">+</b></span></summary>
              <div className="ai-assist-heading"><div><span className="eyebrow">Premium AI</span><strong>Write for your brand and audience.</strong></div><span className="ai-preview-badge">{subscription?.features.ai_assistant ? "Unlocked" : "Premium"}</span></div>
              {subscription?.features.ai_assistant ? <>
                <div className="ai-assist-controls"><label htmlFor="ai-action">Help me <Dropdown label="AI writing task" id="ai-action" value={aiAction} onValueChange={(value) => setAiAction(value as AIAssistAction)}><option value="caption">write a caption</option><option value="improve">improve this idea</option><option value="hashtags">find hashtags</option><option value="shorten">make it shorter</option></Dropdown></label><button className="ai-assist-button" type="button" disabled={aiLoading} onClick={() => void runAIAssist()}>{aiLoading ? "Creating suggestion..." : imageFiles.length && (aiAction === "caption" || aiAction === "hashtags") ? "Generate from photos" : "Assist"}</button></div>
                {aiError ? <p className="error-message" role="alert">{aiError}</p> : null}
                {aiResult ? <div className="ai-assist-result"><span className="ai-result-source">{aiResult.simulated ? "Preview output" : "AI generated"}</span>{aiResult.context?<p className="ai-assist-hint">Personalized for {aiResult.context.brand.name}. Using {aiResult.context.evidence.reduce((total,source)=>total+source.top_posts.length,0)} observed posts where insights are available. <Link href="/analytics">Set your brand context and review your growth plan</Link>.</p>:null}<p>{aiResult.content}</p><div><button type="button" onClick={() => setCaption(aiResult.content)}>Use this text</button></div><ul>{aiResult.suggestions.map((suggestion) => <li key={suggestion}>{suggestion}</li>)}</ul><AIFeedback generationId={aiResult.generation_id} /></div> : <p className="ai-assist-hint">Add your photos below, then generate a caption or hashtags from what is in them. Improve and shorten use your caption draft. Your saved brand context and available performance help shape suggestions.</p>}
              </> : <div className="ai-premium-lock"><span aria-hidden="true">✦</span><div><strong>Create faster with Premium AI</strong><p>Upgrade to generate captions, sharpen ideas, shorten copy, and discover relevant hashtags from your daily plan.</p><Link href="/billing">See Premium benefits →</Link></div></div>}
            </details>

            <fieldset className="platform-fieldset">
              <legend>Publish to</legend>
              <div className="platform-options">
                <label className={platforms.includes("instagram") ? "platform-option selected" : "platform-option"}><input type="checkbox" checked={platforms.includes("instagram")} onChange={() => togglePlatform("instagram")} /><SocialIcon className="mini-provider" provider="instagram" /><div><strong>Instagram</strong><small>Business account</small></div></label>
                <label className={platforms.includes("facebook") ? "platform-option selected" : "platform-option"}><input type="checkbox" disabled={postType === "story"} checked={platforms.includes("facebook")} onChange={() => togglePlatform("facebook")} /><SocialIcon className="mini-provider" provider="facebook" /><div><strong>Facebook</strong><small>Page ? photos, videos and Reels</small></div></label>
                <label className={platforms.includes("threads") ? "platform-option selected" : "platform-option"}><input type="checkbox" disabled={postType === "story" || postType === "reel" || files.length > 1} checked={platforms.includes("threads")} onChange={() => togglePlatform("threads")} /><SocialIcon className="mini-provider" provider="threads" /><div><strong>Threads</strong><small>Text, one image or one video · 500 characters</small></div></label>
                <label className={platforms.includes("youtube") ? "platform-option selected" : "platform-option"}><input type="checkbox" disabled={postType !== "video"} checked={platforms.includes("youtube")} onChange={() => togglePlatform("youtube")} /><SocialIcon className="mini-provider" provider="youtube" /><div><strong>YouTube</strong><small>{postType === "video" ? "Video channel" : "Choose Video format"}</small></div></label>
                <label className={platforms.includes("twitter") ? "platform-option selected" : "platform-option"}><input type="checkbox" disabled={postType !== "post" || files.length > 0} checked={platforms.includes("twitter")} onChange={() => togglePlatform("twitter")} /><SocialIcon className="mini-provider" provider="twitter" /><div><strong>X</strong><small>Text only · up to 280 characters</small></div></label>
                <label className={platforms.includes("pinterest") ? "platform-option selected" : "platform-option"}><input type="checkbox" disabled={postType !== "post" || files.length > 1 || files.some(file => !/\.(jpe?g|png)$/i.test(file.name))} checked={platforms.includes("pinterest")} onChange={() => togglePlatform("pinterest")} /><SocialIcon className="mini-provider" provider="pinterest" /><div><strong>Pinterest</strong><small>One JPG or PNG image Pin</small></div></label>
                {comingSoonProviders.map(provider => <label key={provider} className="platform-option"><input type="checkbox" disabled checked={false} /><SocialIcon className="mini-provider" provider={provider} /><div><strong>{platformName(provider)}</strong><small>Coming soon</small></div></label>)}
                <label className={platforms.includes("linkedin") ? "platform-option selected" : "platform-option"}><input type="checkbox" disabled={postType === "story" || postType === "reel"} checked={platforms.includes("linkedin")} onChange={() => togglePlatform("linkedin")} /><SocialIcon className="mini-provider" provider="linkedin" /><div><strong>LinkedIn</strong><small>Professional audience</small></div></label>
              </div>
            </fieldset>
            {(["instagram", "linkedin", "threads", "youtube", "twitter", "pinterest"] as const).filter(provider => platforms.includes(provider)).map(provider => {
              const accounts = networkAccounts.filter(account => account.provider === provider);
              const label = `${platformName(provider)} ${provider === "youtube" ? "channel" : "account"}`;
              return <div className="composer-row composer-channel-account" key={provider}><div className="composer-field">
                <label htmlFor={`${provider}-account`}>{label}</label>
                <Dropdown id={`${provider}-account`} label={label} value={String(networkOptions[`${provider}_account_id`] ?? "")} placeholder={`Choose ${label}`} onValueChange={value => setNetworkOptions(current => {
                  const next = {...current, [`${provider}_account_id`]: Number(value)};
                  if (provider === "pinterest" && current.pinterest_account_id !== Number(value)) delete next.pinterest_board_id;
                  if (provider === "instagram" && current.instagram_account_id !== Number(value)) {
                    for (const key of ["instagram_audio_id", "instagram_audio_title", "instagram_audio_artist", "instagram_audio_volume", "instagram_video_volume"]) delete next[key];
                  }
                  return next;
                })}>{accounts.map(account => <option value={account.id} key={account.id}>{account.account_name}</option>)}</Dropdown>
                {!loading && !accounts.length && <p className="composer-field-hint">Connect {provider === "youtube" ? "a YouTube channel" : `a ${platformName(provider)} account`} in <Link href="/accounts">Accounts</Link> before publishing.</p>}
                {provider === "pinterest" && accounts.length > 1 && !networkOptions.pinterest_account_id && <p className="composer-field-hint">Choose your Pinterest account. For a Trial demo, select the account marked (Sandbox).</p>}
              </div></div>;
            })}
            {platforms.includes("youtube") && <fieldset className="composer-channel-settings">
              <legend><SocialIcon provider="youtube" />YouTube details</legend>
              <div className="composer-settings-grid">
                <div className="composer-field composer-field-wide"><label htmlFor="youtube-title">Video title</label><input id="youtube-title" placeholder="Give your video a title" maxLength={100} value={String(networkOptions.youtube_title ?? "")} onChange={event => setNetworkOptions(current => ({...current,youtube_title:event.target.value}))} /></div>
                <div className="composer-field"><label htmlFor="youtube-privacy">Visibility</label><Dropdown id="youtube-privacy" label="Video visibility" value={String(networkOptions.youtube_privacy ?? "private")} onValueChange={value => setNetworkOptions(current => ({...current,youtube_privacy:value}))}><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></Dropdown></div>
                <div className="composer-field"><label htmlFor="youtube-audience">Made for kids?</label><Dropdown id="youtube-audience" label="Video audience" placeholder="Choose audience" value={typeof networkOptions.youtube_made_for_kids === "boolean" ? String(networkOptions.youtube_made_for_kids) : ""} onValueChange={value => setNetworkOptions(current => ({...current,youtube_made_for_kids:value === "true"}))}><option value="false">No, not made for kids</option><option value="true">Yes, made for kids</option></Dropdown></div>
                <label className="composer-checkbox composer-field-wide"><input type="checkbox" checked={networkOptions.youtube_synthetic_media === true} onChange={event => setNetworkOptions(current => ({...current,youtube_synthetic_media:event.target.checked}))} /><span>Contains realistic altered or synthetic content</span></label>
              </div>
            </fieldset>}
            {platforms.includes("pinterest") && <fieldset className="composer-channel-settings">
              <legend><SocialIcon provider="pinterest" />Pin details</legend>
              <div className="composer-settings-grid">
                <div className="composer-field composer-field-wide"><label htmlFor="pinterest-board">Pinterest board</label><Dropdown id="pinterest-board" label="Pinterest board" placeholder={!networkOptions.pinterest_account_id ? "Choose an account first" : pinterestBoards.length ? "Choose a board" : "No boards available"} value={String(networkOptions.pinterest_board_id ?? "")} onValueChange={value => setNetworkOptions(current => ({...current,pinterest_board_id:value}))}>{pinterestBoards.map(board => <option key={board.id} value={board.id}>{board.name}</option>)}</Dropdown>{networkAccounts.some(account => account.id === networkOptions.pinterest_account_id && account.environment === "sandbox") ? <><p className="composer-field-hint">Sandbox Pins are for Pinterest Trial review. Prepare the demo board here if the list is empty.</p><button className="secondary-button" type="button" disabled={preparingPinterestBoard} onClick={() => void preparePinterestTrialBoard()}>{preparingPinterestBoard ? "Preparing demo board..." : "Create or select Sandbox demo board"}</button></> : networkOptions.pinterest_account_id && !pinterestBoards.length ? <p className="composer-field-hint">Create a board in Pinterest, then reload this page to select it.</p> : null}</div>
                <div className="composer-field composer-field-wide"><label htmlFor="pinterest-title">Pin title</label><input id="pinterest-title" placeholder="Add a title for your Pin" maxLength={100} value={String(networkOptions.pinterest_title ?? "")} onChange={event => setNetworkOptions(current => ({...current,pinterest_title:event.target.value}))} /></div>
                <div className="composer-field composer-field-wide"><label htmlFor="pinterest-link">Destination link <span>(optional)</span></label><input id="pinterest-link" type="url" placeholder="https://yourwebsite.com" value={String(networkOptions.pinterest_link ?? "")} onChange={event => setNetworkOptions(current => ({...current,pinterest_link:event.target.value}))} /></div>
              </div>
            </fieldset>}
            {platforms.includes("facebook") && <div className="composer-row"><div><label htmlFor="facebook-page">Facebook Page</label><Dropdown id="facebook-page" label="Facebook Page" value={facebookAccountId} onValueChange={setFacebookAccountId} placeholder="Choose a Facebook Page">{facebookPages.map(page => <option key={page.id} value={page.id}>{page.account_name}</option>)}</Dropdown>{!facebookPages.length && <p>Connect a Facebook Page in Accounts before publishing.</p>}</div></div>}

            <div className="composer-row composer-upload-row">
              <label className="upload-control"><span className="upload-symbol" aria-hidden="true">↑</span><div className="upload-copy"><strong>{postType === "post" ? "Add images or video" : postType === "story" ? "Add an image or video" : "Add video"}</strong><small>JPG / PNG · 25 MB per image. MP4 / MOV · 25 MB per video.</small><small>{postType === "post" ? "Up to 10 images or one video. Selecting a video switches the post format." : "One media file."} Social9 total upload limit: 25 MB.</small></div><span className="upload-choose">Choose files</span><input aria-label="Upload images or video" key={postType} type="file" multiple={postType === "post"} accept={postType === "post" || postType === "story" ? ".jpg,.jpeg,.png,.mp4,.mov" : ".mp4,.mov"} onChange={selectFiles} /></label>
            </div>

            {files.length ? <ul className="media-list">{files.map((file) => <li key={`${file.name}-${file.size}`}><span>{/\.(mp4|mov)$/i.test(file.name) ? "Video" : <LocalImagePreview file={file} alt={`Selected image: ${file.name}`} />}</span><strong>{file.name}</strong><button className="media-edit-action" type="button" disabled={saving!==null} onClick={()=>{setEditError("");setEditingFile(file);}}>Edit</button><button type="button" onClick={() => { setFiles((current) => current.filter((item) => item !== file)); setCollageOriginals(null); setCollagePreview(""); }} aria-label={`Remove ${file.name}`}>×</button></li>)}</ul> : null}
            {postType === "post" && files.length >= 2 && files.length <= 9 ? <button className="collage-action" type="button" disabled={collageBusy} onClick={() => void createCollage()}>{collageBusy ? "Creating collage..." : "Make one grid collage from these images"}</button> : null}
            {collagePreview ? <div className="collage-preview"><Image src={collagePreview} alt="Preview of your grid collage" width={108} height={108} unoptimized /><div><strong>Grid collage ready</strong><p>The uploaded images are combined into one square image for your post.</p><button type="button" onClick={() => { setFiles(collageOriginals ?? []); setCollageOriginals(null); setCollagePreview(""); }}>Use original images instead</button></div></div> : null}

            {platforms.includes("instagram") && <InstagramMusic key={Number(networkOptions.instagram_account_id || 0)} accountId={Number(networkOptions.instagram_account_id || 0)} postType={postType} options={networkOptions} setOptions={setNetworkOptions} files={files} caption={caption} scheduledFor={scheduledFor} setScheduledFor={setScheduledFor} instagramOnly={platforms.length === 1} busy={saving !== null} />}
            <div className="composer-actions">
              <button className="secondary-button" type="button" disabled={saving !== null} onClick={() => void savePost("draft")}>{saving === "draft" ? "Saving..." : "Save draft"}</button>
              <button className="secondary-button schedule-button" type="button" disabled={saving !== null || (platforms.includes("instagram") && !!networkOptions.instagram_manual_music)} onClick={() => setScheduleOpen(true)}>{saving === "scheduled" ? "Scheduling..." : "Schedule post"}</button>
              <button className="primary-composer-button publish-now-button" type="button" disabled={saving !== null || (platforms.includes("instagram") && !!networkOptions.instagram_manual_music)} onClick={() => void savePost("publish")}>{saving === "publish" ? "Publishing..." : "Publish now"}</button>
            </div>
          </section>

          <aside className="composer-side" aria-label="Post preview">
            <PostPreview files={files} caption={caption} platforms={platforms} postType={postType} titles={{youtube:String(networkOptions.youtube_title || ""),pinterest:String(networkOptions.pinterest_title || "")}} accounts={Object.fromEntries(platforms.map(provider => [provider, provider === "facebook" ? facebookPages.find(page => String(page.id) === facebookAccountId)?.account_name || "Choose a Facebook Page" : networkAccounts.find(account => account.provider === provider && (!networkOptions[`${provider}_account_id`] || account.id === networkOptions[`${provider}_account_id`]))?.account_name || "Your account"]))} />
          </aside>
          <section className="saved-posts-card composer-recent" aria-label="Recent posts">
            <div className="recent-posts-heading"><h2>Recent posts</h2><Link href="/content">View content library →</Link></div>
            {loading ? <p className="empty-posts">Loading saved posts...</p> : posts.length === 0 ? <p className="empty-posts">No drafts yet. Your saved and scheduled content will appear here.</p> : (
              <ul className="saved-posts-list">{posts.slice(0, 6).map((post) => <li key={post.id}><div className="saved-post-meta"><span className={`post-status ${post.status}`}>{post.status}</span><small>{post.post_type ?? "post"} · {post.platforms.join(" + ")}</small></div><RecentPostCard post={post} accounts={Object.fromEntries(post.platforms.map(provider=>[provider,provider==="facebook"?facebookPages.find(page=>page.id===post.facebook_account_id)?.account_name || "Facebook Page":networkAccounts.find(account=>account.provider===provider)?.account_name || "Your account"]))} />{post.publish_error ? <small className="saved-post-error">{post.publish_error}</small> : null}{post.scheduled_for ? <time dateTime={post.scheduled_for}>{new Date(post.scheduled_for).toLocaleString()}</time> : <time dateTime={post.created_at}>{post.published_at ? `Published ${new Date(post.published_at).toLocaleDateString()}` : `Saved ${new Date(post.created_at).toLocaleDateString()}`}</time>}<div className="saved-post-actions">{post.status !== "published" && post.status !== "publishing" && !post.network_options?.instagram_manual_music ? <button className="publish-saved-button" type="button" disabled={publishingId !== null} onClick={() => void publishExisting(post.id)}>{publishingId === post.id ? "Publishing..." : "Publish now"}</button> : null}<button className="delete-saved-button" type="button" onClick={() => setPendingDelete(post)}>Delete</button></div></li>)}</ul>
            )}
          </section>
        </div>

        {editError && <p role="alert" className="schedule-dialog-error">{editError}</p>}
        {editingFile && <MediaEditor file={editingFile} onClose={()=>setEditingFile(null)} onApply={edited=>{const next=files.map(file=>file===editingFile?edited:file);if(next.reduce((total,file)=>total+file.size,0)>25*1024*1024){throw new Error("Edited attachments exceed the 25 MB total limit. Remove an attachment or use a smaller image.");}setFiles(next);setCollageOriginals(null);setCollagePreview("");}} />}
        {scheduleOpen && <ScheduleDialog value={scheduledFor} onChange={setScheduledFor} onClose={()=>setScheduleOpen(false)} busy={saving!==null} error={error} onSchedule={()=>{void savePost("scheduled").then(success=>{if(success)setScheduleOpen(false);});}} />}
        {pendingDelete ? <ConfirmationDialog
          busy={deleting}
          confirmLabel="Delete post"
          description="This permanently removes the post from Social9. Content that was already published on a social network will not be removed from that network."
          eyebrow="Delete content"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void deletePost()}
          title="Delete this post?"
        /> : null}
    </DashboardPageFrame>
  );
}

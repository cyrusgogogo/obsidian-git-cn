<script lang="ts">
    import { getDisplayPath } from "src/utils";

    let { path }: { path: string } = $props();
    let directory = $derived(path.slice(0, path.lastIndexOf("/")));
</script>

<div class="tree-item-inner nav-file-title-content file-label">
    <span class="file-name">{getDisplayPath(path)}</span>
    {#if path.includes("/")}
        <small class="file-directory">{directory}</small>
    {/if}
</div>

<style>
    .file-label {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        line-height: 1.4;
    }

    .file-name,
    .file-directory {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
    }

    .file-directory {
        color: var(--text-faint);
        font-size: var(--font-smallest);
    }
</style>

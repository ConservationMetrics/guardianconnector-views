<template>
  <div>
    <div v-if="isImage" class="mb-4">
      <a
        :href="mediaBasePath + '/' + filePath"
        target="_blank"
        :data-lightbox="filePath"
        :data-title="filePath"
      >
        <img
          :src="mediaBasePath + '/' + filePath"
          alt="Image"
          class="w-full h-auto rounded-lg"
          loading="lazy"
        />
      </a>
      <div v-if="filePath" class="text-center">
        <span v-if="filePath.includes('t0.jpg')" class="italic">{{
          $t("before")
        }}</span>
        <span v-else-if="filePath.includes('t1.jpg')" class="italic">{{
          $t("after")
        }}</span>
      </div>
    </div>
    <div v-if="isAudio" class="mb-4">
      <audio controls class="w-full" preload="none">
        <source
          :src="mediaBasePath + '/' + filePath"
          :type="'audio/' + getExtension(filePath)"
        />
        {{ $t("browserDoesntSupportAudio") }}.
      </audio>
    </div>
    <div v-if="isVideo" class="mb-4">
      <video controls class="w-full h-auto rounded-lg" preload="none">
        <source
          :src="mediaBasePath + '/' + filePath"
          :type="'video/' + getExtension(filePath)"
        />
        {{ $t("browserDoesntSupportVideo") }}.
      </video>
    </div>
  </div>
</template>

<script>
export default {
  props: [
    "audioExtensions",
    "filePath",
    "imageExtensions",
    "mediaBasePath",
    "videoExtensions",
  ],
  computed: {
    isAudio() {
      return this.checkExtension(this.audioExtensions);
    },
    isImage() {
      return this.checkExtension(this.imageExtensions);
    },
    isVideo() {
      return this.checkExtension(this.videoExtensions);
    },
  },
  methods: {
    checkExtension(extensions) {
      if (!extensions) return false;
      const extension = this.getExtension(this.filePath);
      return extensions.includes(extension);
    },
    getExtension(filePath) {
      return filePath.split(".").pop().toLowerCase();
    },
  },
};
</script>

<style scoped></style>

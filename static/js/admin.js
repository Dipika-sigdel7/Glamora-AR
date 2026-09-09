document.addEventListener("DOMContentLoaded", () => {

    const imageInput = document.getElementById("images");
    const imagePreview = document.getElementById("imagePreview");

    if (!imageInput || !imagePreview) {
        return;
    }


    imageInput.addEventListener("change", () => {

        imagePreview.innerHTML = "";

        const files = Array.from(imageInput.files);

        files.forEach((file, index) => {

            if (!file.type.startsWith("image/")) {
                return;
            }

            const reader = new FileReader();

            reader.onload = (event) => {

                const preview = document.createElement("div");

                preview.className = "image-preview";

                preview.innerHTML = `
                    <img
                        src="${event.target.result}"
                        alt="Product image ${index + 1}"
                    >

                    <span>
                        ${index === 0 ? "Primary Image" : `Image ${index + 1}`}
                    </span>
                `;

                imagePreview.appendChild(preview);
            };

            reader.readAsDataURL(file);

        });

    });

});
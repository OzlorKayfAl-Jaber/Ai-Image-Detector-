// set the number of tags to display page 
const tagsPerPage=20;

// Event listener for the upload button
document.getElementById('uploadButton').addEventListener('click', async ()=> {
        // Elements and file handling
        const fileInput=document.getElementById('fileInput');
        const file=fileInput.files[0];
        const imagePreview=document.getElementById('imagePreview');
        const uploadModal=document.getElementById('uploadModal');
        const uploadProgress=document.getElementById('uploadProgress');

        // If no file is selected, show a toast message
        if ( !file) return showToast('Please select an image to upload.');

        // Preview the selected image
        const reader=new FileReader();
        reader.onload=e=> imagePreview.src=e.target.result;
        reader.readAsDataURL(file);

        // Imaga API credentials
        const apiKey='acc_b32c050bdfeabc5';
        const apiSecret='0981ddde0b56c49c51edf3c6c261676a';

        const authHeader='Basic '+ btoa(`${apiKey}:${apiSecret}`);

        // Prepare data for upload
        const formData=new FormData();
        formData.append('image', file);

        try {
            // Show the upload modal and reset progress bar
            uploadModal.style.display='block';
            uploadProgress.value=0;

            // upoload image to imagga
            const uploadResponse=await fetch('https://api.imagga.com/v2/uploads', {

                    method: 'POST',
                    headers: {
                        'Authorization': authHeader
                    }

                    ,
                    body: formData
                }

            );

            if ( !uploadResponse.ok) throw new Error('Image upload failed.');

            // track upload progress
            const contentLength=+uploadResponse.headers.get('Content-Length');
            const reader=uploadResponse.body.getReader();
            let receivedLength=0;
            let chunks=[];

            // Read response stream and update progress
            while(true) {
                const {
                    done, value
                }

                =await reader.read();
                if(done) break;
                chunks.push(value);
                receivedLength +=value.length;

                uploadProgress.style.width=`${(receivedLength / contentLength) * 100}%`;
            }

            // Decode and parse the upload response
            const responseArray=new Uint8Array(receivedLength);
            let position=0;

            for (const chunk of chunks) {
                responseArray.set(chunk, position);
                position +=chunk.length;
            }

            const text=new TextDecoder().decode(responseArray);

            const { result: { upload_id } } = JSON.parse(text);

            // Fetch color and tag analysis from Imagga
        const [colorResult, tagsResult]=await Promise.all([ fetch(`https://api.imagga.com/v2/colors?image_upload_id=${upload_id}`, {
                headers: {
                    'Authorization': authHeader
                }
            }).then(res=> res.json()),
            fetch(`https://api.imagga.com/v2/tags?image_upload_id=${upload_id}&limit=${tagsPerPage}`, {
                headers: {
                    'Authorization': authHeader
                }
            }).then(res=> res.json())]);

    // Display the results 
    displayResults(colorResult.result.colors);
    displayTags(tagsResult.result.tags);
}

catch (error) {
    showToast('An error occurred: '+ error.message);
}

finally {
    // Hide the upload modal after processing
    uploadModal.style.display='none';
}

}

);


// Function to display color analysis results
const displayColors=colors=> {
    const colorContainer=document.querySelector('.color-results');
    colorContainer.innerHTML=''; // Clear previous results

    // If no colors are detected, show a message
    if(colors.length===0) {
        colorContainer.innerHTML='<p>No colors detected.</p>';
        return;
    }

    // Generate HTML sections for different color categories
    const categoriesColorSection=(title, ColorData)=>`<h3>${title}</h3><div class="color-category">${ColorData.map(color=> `<div class="color-swatch" style="background-color: ${color.html_code};"><span>${color.html_code}</span></div>`).join('')}</div>`;

    // Append color categories to the container
    colorContainer.innerHTML+=categoriesColorSection('Foreground Colors', colors.foreground_colors);
    colorContainer.innerHTML+=categoriesColorSection('Background Colors', colors.background_colors);
    colorContainer.innerHTML+=categoriesColorSection('Image Colors', colors.image_colors);

    // Add click event listeners to color swatches for copying hex codes
    document.querySelectorAll('.color-swatch').forEach(swatch=> {
            swatch.addEventListener('click', ()=> {
                    const hexCode=swatch.querySelector('span').textContent;

                    navigator.clipboard.writeText(hexCode).then(()=> {
                            showToast(`Copied ${hexCode} to clipboard!`);
                        }

                    ).catch(err=> {
                            showToast('Failed to copy: '+ err);
                        }

                    );
                }

            );
        }

    );
}

;

// Function to display tags with pagination (see more)

let allTags=[];
let displayedTagsCount=0;

const displayTags=tags=> {
    const tagsContainer=document.querySelector('.tags-results');
    const resultsCount=document.querySelector('.results-count');

    // Update the global tags array and reset the displayed count
    allTags=tags;
    displayedTagsCount=0;

    // Function to render a batch of tags
    const renderTags=()=> {
        const batch=allTags.slice(displayedTagsCount, displayedTagsCount + tagsPerPage);

        batch.forEach(tag=> {
                const tagElement=document.createElement('span');
                tagElement.className='tag';
                tagElement.textContent=tag.tag.en;
                tagsContainer.appendChild(tagElement);
            }

        );
        displayedTagsCount+=batch.length;

        resultsCount.textContent=`Showing ${displayedTagsCount} of ${allTags.length} tags`;
    }

    ;

    // Initial render
    renderTags();

    // Show more button functionality
    const showMoreButton=document.querySelector('.show-more-tags');
    showMoreButton.style.display=displayedTagsCount < allTags.length ? 'block' : 'none';

    showMoreButton.onclick=()=> {
        renderTags();
        showMoreButton.style.display=displayedTagsCount < allTags.length ? 'block': 'none';
    };
}

;

// Function to export tags to a text file
const exportTags=()=> {
    if(allTags.length===0) return showToast('No tags to export.');
    const tagText=allTags.map(tag=> tag.tag.en).join('\n');

    const blob=new Blob([tagText], {
            type: 'text/plain'
        }

    );
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download='tags.txt';
    a.click();
    URL.revokeObjectURL(url);
}

;

// Function to show toast messages
const showToast=message=> {
    const toast=document.createElement('div');
    toast.className='toast';
    toast.textContent=message;
    document.body.appendChild(toast);

    setTimeout(()=> {
            toast.remove();
        }

        , 3000);
};


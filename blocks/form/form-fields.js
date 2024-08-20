import { toClassName } from '../../scripts/aem.js';

function createFieldWrapper(fd) {
  const fieldWrapper = document.createElement('div');
  if (fd.Style) fieldWrapper.className = fd.Style;
  fieldWrapper.classList.add('field-wrapper', `${fd.Type}-wrapper`);

  fieldWrapper.dataset.fieldset = fd.Fieldset;

  return fieldWrapper;
}

const linkHandler = (plainText) => {
  // regexp to find markdown links
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;

  // replace makrdown links with HTML links
  const textWithLinks = plainText.replace(markdownLinkRegex, (match, linkText, url) => `<a href="${url}">${linkText}</a>`);

  return textWithLinks;
};

const ids = [];
function generateFieldId(fd, suffix = '') {
  const slug = toClassName(`form-${fd.Name}${suffix}`);
  ids[slug] = ids[slug] || 0;
  const idSuffix = ids[slug] ? `-${ids[slug]}` : '';
  ids[slug] += 1;
  return `${slug}${idSuffix}`;
}

function createLabel(fd) {
  const label = document.createElement('label');
  label.id = generateFieldId(fd, '-label');
  label.innerHTML = linkHandler(fd.Label || fd.Name);
  label.setAttribute('for', fd.Id);
  if (fd.Mandatory.toLowerCase() === 'true' || fd.Mandatory.toLowerCase() === 'x') {
    label.dataset.required = true;
  }
  return label;
}

function createErrorMessage() {
  const errorWrapper = document.createElement('div');
  errorWrapper.classList.add('form-error-message-wrapper');
  const errorMessage = document.createElement('span');
  errorMessage.classList.add('form-error-message');

  errorWrapper.append(errorMessage);

  return errorWrapper;
}

function setCommonAttributes(field, fd) {
  const isMandator = fd.Mandatory && (fd.Mandatory.toLowerCase() === 'true' || fd.Mandatory.toLowerCase() === 'x');

  field.id = fd.Id;
  field.name = fd.Name;
  field.required = isMandator;
  field.placeholder = fd.Placeholder;
  field.value = fd.Value;

  field.oninvalid = (e) => {
    e.preventDefault();

    const fieldWrapper = e.target.closest('.field-wrapper');
    const errorMesageEl = fieldWrapper.querySelector('.form-error-message');

    fieldWrapper.classList.add('error');

    if (errorMesageEl) {
      errorMesageEl.textContent = e.target.validationMessage;
    }
  };

  field.oninput = (e) => {
    const fieldWrapper = e.target.closest('.field-wrapper');
    const errorMesageEl = fieldWrapper.querySelector('.form-error-message');

    fieldWrapper.classList.remove('error');

    if (errorMesageEl) {
      errorMesageEl.textContent = '';
    }
  };
}

const createPlaintext = (fd) => {
  const fieldWrapper = createFieldWrapper(fd);

  const text = document.createElement('p');
  text.innerHTML = linkHandler(fd.Value || fd.Label);
  text.id = fd.Id;

  fieldWrapper.append(text);

  return { field: text, fieldWrapper };
};

const createSelect = async (fd) => {
  const select = document.createElement('select');
  setCommonAttributes(select, fd);
  const addOption = ({ text, value }) => {
    const option = document.createElement('option');
    option.text = text.trim();
    option.value = value.trim();
    if (option.value === select.value) {
      option.setAttribute('selected', '');
    }
    select.add(option);
    return option;
  };

  if (fd.Placeholder) {
    const ph = addOption({ text: fd.Placeholder, value: '' });
    ph.setAttribute('disabled', '');
  }

  if (fd.Options) {
    let options = [];
    if (fd.Options.startsWith('https://')) {
      const optionsUrl = new URL(fd.Options);
      const resp = await fetch(`${optionsUrl.pathname}${optionsUrl.search}`);
      const json = await resp.json();
      json.data.forEach((opt) => {
        options.push({
          text: opt.Option,
          value: opt.Value || opt.Option,
        });
      });
    } else {
      options = fd.Options.split(',').map((opt) => ({
        text: opt.trim(),
        value: opt.trim().toLowerCase(),
      }));
    }

    options.forEach((opt) => addOption(opt));
  }

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(select);
  fieldWrapper.prepend(createLabel(fd));
  fieldWrapper.append(createErrorMessage());

  return { field: select, fieldWrapper };
};

const createConfirmation = (fd, form) => {
  form.dataset.confirmation = new URL(fd.Value).pathname;

  return {};
};

const createSubmit = (fd) => {
  const button = document.createElement('button');
  button.textContent = fd.Label || fd.Name;
  button.classList.add('button');
  button.type = 'submit';

  const fieldWrapper = createFieldWrapper(fd);
  fieldWrapper.append(button);
  button.disabled = true;
  return { field: button, fieldWrapper };
};

const createTextArea = (fd) => {
  const field = document.createElement('textarea');
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);
  field.setAttribute('rows', 5);
  fieldWrapper.append(field);
  fieldWrapper.prepend(label);
  fieldWrapper.append(createErrorMessage());

  return { field, fieldWrapper };
};

const createInput = (fd) => {
  const field = document.createElement('input');
  field.type = fd.Type;
  setCommonAttributes(field, fd);

  const fieldWrapper = createFieldWrapper(fd);
  const label = createLabel(fd);
  field.setAttribute('aria-labelledby', label.id);
  fieldWrapper.append(field);
  if (fd.Type === 'radio' || fd.Type === 'checkbox') {
    fieldWrapper.append(label);
  } else {
    fieldWrapper.prepend(label);
  }
  fieldWrapper.append(createErrorMessage());

  return { field, fieldWrapper };
};

const createCheckbox = (fd) => {
  const { field, fieldWrapper } = createInput(fd);
  if (!field.value) field.value = 'checked';
  fieldWrapper.classList.add('selection-wrapper');

  return { field, fieldWrapper };
};

const FIELD_CREATOR_FUNCTIONS = {
  select: createSelect,
  plaintext: createPlaintext,
  submit: createSubmit,
  confirmation: createConfirmation,
  checkbox: createCheckbox,
  textarea: createTextArea,
};

export default async function createField(fd, form) {
  fd.Id = fd.Id || generateFieldId(fd);
  const type = fd.Type.toLowerCase();
  const createFieldFunc = FIELD_CREATOR_FUNCTIONS[type] || createInput;
  const fieldElements = await createFieldFunc(fd, form);

  return fieldElements.fieldWrapper;
}

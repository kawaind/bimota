import createField from './form-fields.js';
import { sampleRUM } from '../../scripts/aem.js';
import { getTextLabel } from '../../scripts/scripts.js';

async function createForm(formHref) {
  const { pathname } = new URL(formHref);
  const resp = await fetch(pathname);
  const json = await resp.json();

  const form = document.createElement('form');
  // eslint-disable-next-line prefer-destructuring
  form.dataset.action = json.data.find((el) => el.Type === 'submit').Value;

  const fields = await Promise.all(json.data.map((fd) => createField(fd, form)));
  fields.forEach((field) => {
    if (field) {
      form.append(field);
    }
  });

  // create general error form message
  const generalErrorWrapper = document.createElement('div');
  const generalErrorText = document.createElement('span');
  generalErrorWrapper.classList.add('form-general-error-wrapper');
  generalErrorText.classList.add('form-general-error-text');

  generalErrorWrapper.append(generalErrorText);
  form.append(generalErrorWrapper);

  return form;
}

function generatePayload(form) {
  const payload = {};

  [...form.elements].forEach((field) => {
    if (field.name && field.type !== 'submit' && !field.disabled) {
      if (field.type === 'radio') {
        if (field.checked) payload[field.name] = field.value;
      } else if (field.type === 'checkbox') {
        if (field.checked) payload[field.name] = payload[field.name] ? `${payload[field.name]},${field.value}` : field.value;
      } else {
        payload[field.name] = field.value;
      }
    }
  });
  return payload;
}

function handleSubmitError(form, error) {
  // eslint-disable-next-line no-console
  console.error(error);
  form.querySelector('button[type="submit"]').disabled = false;
  const generalErrorWrapper = form.querySelector('.form-general-error-wrapper');
  const generalErrorText = generalErrorWrapper.querySelector('.form-general-error-text');

  generalErrorWrapper.classList.add('show');
  generalErrorText.textContent = getTextLabel('submitError');

  sampleRUM('form:error', { source: '.form', target: error.stack || error.message || 'unknown error' });
}

async function handleSubmit(form) {
  if (form.getAttribute('data-submitting') === 'true') return;

  const submit = form.querySelector('button[type="submit"]');
  try {
    form.setAttribute('data-submitting', 'true');
    submit.disabled = true;

    // create payload
    const payload = generatePayload(form);
    const response = await fetch(form.dataset.action, {
      method: 'POST',
      body: JSON.stringify({ data: payload }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (response.ok) {
      sampleRUM('form:submit', { source: '.form', target: form.dataset.action });
      if (form.dataset.confirmation) {
        window.location.href = form.dataset.confirmation;
      }
    } else {
      const error = await response.text();
      throw new Error(error);
    }
  } catch (e) {
    handleSubmitError(form, e);
  } finally {
    form.setAttribute('data-submitting', 'false');
  }
}

export default async function decorate(block) {
  const formLink = block.querySelector('a[href$=".json"]');

  if (!formLink) return;

  const form = await createForm(formLink.href);
  const submitButton = form.querySelector('button[type="submit"]');
  block.replaceChildren(form);

  /* enabling the submit button only when all of the checkboxes are checked */
  const checkboxList = [...form.querySelectorAll('input[type="checkbox"]')];
  checkboxList.forEach((checkbox) => {
    checkbox.addEventListener('input', () => {
      const disabled = checkboxList.length !== checkboxList.filter((ch) => ch.checked).length;
      submitButton.disabled = disabled;
    });
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const valid = form.checkValidity();

    if (valid) {
      handleSubmit(form);
    } else {
      const firstInvalidEl = form.querySelector(':invalid:not(fieldset)');
      if (firstInvalidEl) {
        firstInvalidEl.focus();
        firstInvalidEl.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });
}

import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

@Pipe({
  name: 'highlight',
  standalone: true
})
export class HighlightPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(value: string | null | undefined, search: string | null | undefined): SafeHtml {
    if (!value) return '';
    if (!search || !search.trim()) return value;

    const q = search.trim();
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escaped})`, 'gi');

    const highlighted = value.replace(
      regex,
      '<mark style="background-color: rgba(250, 204, 21, 0.4); color: inherit; padding: 0 2px; border-radius: 2px;">$1</mark>'
    );

    return this.sanitizer.bypassSecurityTrustHtml(highlighted);
  }
}

# html2pdf

Generate PDFs from any html page.

## Known issues

1. Font-size can't be rendered correctly in Chrome,  Refe to [html2canvas issue 1661](https://github.com/niklasvh/html2canvas/issues/1661).  
   ***Solution***: Set the font style on the outer container:

    ```css
    #container  
    {  
      font-variant: normal;
    }
    ```
